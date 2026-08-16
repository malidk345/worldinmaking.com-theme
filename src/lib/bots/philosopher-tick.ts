/**
 * Hourly philosopher forum tick.
 *
 * Production is Cloudflare Pages Edge: one request cannot finish two LLM
 * writes plus RSS. GitHub Actions therefore POSTs `topic` then `reply`.
 *
 * Quality contract: RSS is a multi-feed briefing (not a title lottery),
 * replies see the full transcript, and a live thread keeps growing for up
 * to five replies before a new one opens.
 */
import { createForumReply, createForumTopic } from './actions/forum'
import {
    FALLBACK_TOPICS,
    RSS_BUDGET_MS,
    RSS_FEEDS,
    fetchRSSTopic,
    formatRssBriefing,
    makeFallbackBriefing,
    titlesFromRssXml,
    type RssBriefing,
} from './forum-rss'
import {
    FORUM_CONTINUE_WINDOW_MS,
    FORUM_HOUR_LOCK_MS,
    FORUM_OPEN_INSTRUCTION,
    authorFromRow,
    loadBotNameMap,
    loadForumThread,
    shouldContinueThread,
    speakersOf,
} from './forum-thread'
import { instructionForForumMove, pickForumMove } from './forum-moves'
import { supabaseRest } from './supabase-edge'

export const BOT_ROSTER = [
    'spinoza',
    'heidegger',
    'baudrillard',
    'althusser',
    'derrida',
    'weber',
    'adorno',
    'marx',
    'nietzsche',
    'deleuze',
    'zizek',
    'sartre',
    'hegel',
    'arendt',
    'rand',
    'lenin',
] as const

export { FALLBACK_TOPICS, RSS_BUDGET_MS, RSS_FEEDS, fetchRSSTopic, titlesFromRssXml }

export type TickPhase = 'full' | 'plan' | 'topic' | 'reply'
export type TickAction = 'skip' | 'open' | 'reply'

export type TickRequest = {
    phase: TickPhase
    topicId?: string
    topicTitle?: string
    postBot?: string
    replyBot?: string
    /** Optional briefing from the orchestrator. Edge never fetches RSS itself. */
    briefing?: RssBriefing
}

export type TickTopic = {
    id: string
    title: string
    author: string
    phase?: string
}

export type TickResult =
    | {
          success: true
          skipped?: boolean
          reason?: string
          message: string
          phase: TickPhase
          action?: TickAction
          topic?: TickTopic
          reply?: {
              id?: string
              author: string
              phase?: string
              persisted: boolean
              provider?: string
          }
          briefing?: { source?: string; title?: string; feedHits?: number }
          providers?: { topic?: string; reply?: string }
      }
    | {
          success: false
          phase: string
          error: string
          topic?: TickTopic
          thread?: unknown
          reply?: unknown
      }

function botSet(): Set<string> {
    return new Set(BOT_ROSTER.map((b) => b.toLowerCase()))
}

export function pickBot(exclude?: string | string[]): string {
    const skip = new Set(
        (Array.isArray(exclude) ? exclude : exclude ? [exclude] : []).map((name) => name.toLowerCase())
    )
    const pool = BOT_ROSTER.filter((bot) => !skip.has(bot))
    if (pool.length > 0) {
        return pool[Math.floor(Math.random() * pool.length)] || 'nietzsche'
    }
    const last = (Array.isArray(exclude) ? exclude[exclude.length - 1] : exclude)?.toLowerCase()
    const rest = BOT_ROSTER.filter((bot) => bot !== last)
    return rest[Math.floor(Math.random() * rest.length)] || 'nietzsche'
}

function parseBriefing(raw: unknown): RssBriefing | undefined {
    if (!raw || typeof raw !== 'object') return undefined
    const value = raw as Record<string, any>
    const primary = value.primary && typeof value.primary === 'object' ? value.primary : value
    const title = String(primary.title || '').trim()
    if (!title) return undefined
    const related = Array.isArray(value.related)
        ? value.related
              .map((item: any) => ({
                  title: String(item?.title || '').trim(),
                  source: String(item?.source || 'feed'),
                  excerpt: String(item?.excerpt || ''),
                  link: item?.link ? String(item.link) : undefined,
              }))
              .filter((item: { title: string }) => item.title)
        : []
    return {
        primary: {
            title,
            source: String(primary.source || 'worldinmaking.fallback'),
            excerpt: String(primary.excerpt || ''),
            link: primary.link ? String(primary.link) : undefined,
        },
        related,
        feedHits: Number(value.feedHits) || 0,
        itemCount: Number(value.itemCount) || 1,
        usedFallback: value.usedFallback !== false && related.length === 0,
    }
}

export function parseTickRequest(body: unknown, url?: URL): TickRequest {
    const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
    const fromQuery = url?.searchParams.get('phase')
    const phaseRaw = String(raw.phase || fromQuery || 'full').toLowerCase()
    const phase: TickPhase =
        phaseRaw === 'topic' || phaseRaw === 'reply' || phaseRaw === 'plan' ? phaseRaw : 'full'
    const topicId = String(raw.topicId || raw.topic_id || url?.searchParams.get('topicId') || '').trim()
    const topicTitle = String(raw.topicTitle || raw.topic_title || '').trim()
    const postBot = String(raw.postBot || raw.post_bot || '').trim().toLowerCase()
    const replyBot = String(raw.replyBot || raw.reply_bot || '').trim().toLowerCase()
    return {
        phase,
        topicId: /^\d{1,20}$/.test(topicId) ? topicId : undefined,
        topicTitle: topicTitle || undefined,
        postBot: postBot || undefined,
        replyBot: replyBot || undefined,
        briefing: parseBriefing(raw.briefing),
    }
}

type TickPlan =
    | { kind: 'already_ticked'; topic: TickTopic }
    | { kind: 'needs_first_reply'; topic: TickTopic }
    | { kind: 'continue'; topic: TickTopic }
    | { kind: 'fresh' }

function toTopic(row: { id: unknown; title?: unknown; author_id?: unknown; author_name?: unknown }, bots: Map<string, string>): TickTopic {
    return {
        id: String(row.id),
        title: String(row.title || ''),
        author: authorFromRow(row, bots),
    }
}

async function planTick(): Promise<TickPlan> {
    const names = await loadBotNameMap()
    const since = new Date(Date.now() - FORUM_CONTINUE_WINDOW_MS).toISOString()
    const posts = await supabaseRest<any[]>(
        `/community_posts?select=id,title,author_id,created_at,reply_count&created_at=gte.${encodeURIComponent(
            since
        )}&order=created_at.desc&limit=20`
    )
    if (!posts.ok) {
        throw new Error(`Could not read forum: ${posts.error}`)
    }
    if (!Array.isArray(posts.data) || posts.data.length === 0) {
        return { kind: 'fresh' }
    }

    const roster = botSet()
    const candidates = posts.data.filter((row) => roster.has(authorFromRow(row, names).toLowerCase()))
    if (candidates.length === 0) return { kind: 'fresh' }

    const ids = candidates.map((row) => String(row.id)).filter((id) => /^\d{1,20}$/.test(id))
    const replies = ids.length
        ? await supabaseRest<any[]>(
              `/community_replies?post_id=in.(${ids.join(
                  ','
              )})&select=id,post_id,author_id,created_at&order=created_at.asc&limit=80`
          )
        : { ok: true as const, data: [] as any[] }

    const repliesByPost = new Map<string, any[]>()
    if (replies.ok && Array.isArray(replies.data)) {
        for (const row of replies.data) {
            const postId = String(row.post_id)
            const list = repliesByPost.get(postId) || []
            list.push(row)
            repliesByPost.set(postId, list)
        }
    }

    const hourAgo = Date.now() - FORUM_HOUR_LOCK_MS
    const wroteThisHour = candidates.some((post) => {
        const created = Date.parse(String(post.created_at || ''))
        if (Number.isFinite(created) && created >= hourAgo) return true
        return (repliesByPost.get(String(post.id)) || []).some((reply) => {
            const at = Date.parse(String(reply.created_at || ''))
            return Number.isFinite(at) && at >= hourAgo
        })
    })

    const newest = candidates[0]
    const newestReplies = repliesByPost.get(String(newest.id)) || []
    const newestTopic = toTopic(newest, names)

    if (wroteThisHour) {
        if (newestReplies.length === 0) return { kind: 'needs_first_reply', topic: newestTopic }
        const lastAuthor = authorFromRow(newestReplies[newestReplies.length - 1], names)
        if (!roster.has(lastAuthor.toLowerCase())) {
            return { kind: 'needs_first_reply', topic: newestTopic }
        }
        return { kind: 'already_ticked', topic: newestTopic }
    }

    for (const post of candidates) {
        const threadReplies = repliesByPost.get(String(post.id)) || []
        const speakers = new Set(
            [authorFromRow(post, names), ...threadReplies.map((r) => authorFromRow(r, names))]
                .map((n) => n.toLowerCase())
                .filter((n) => n && n !== 'unknown')
        )
        if (shouldContinueThread(threadReplies.length, speakers.size, BOT_ROSTER.length)) {
            return { kind: 'continue', topic: toTopic(post, names) }
        }
    }

    return { kind: 'fresh' }
}

async function openTopic(params: { postBot?: string; briefing?: RssBriefing }): Promise<TickResult> {
    // Edge must not fan out RSS (24 feeds → CF 502). Orchestrator may pass a briefing.
    const briefing = params.briefing || makeFallbackBriefing()
    const postBot = params.postBot || pickBot()
    const thread = await createForumTopic({
        botUsername: postBot,
        question: `Short motion on line 1. Then explain the situation in your own words and argue one cut. Be yourself. Do not cite the memo.`,
        context: formatRssBriefing(briefing),
        trustedInstruction: FORUM_OPEN_INSTRUCTION,
        mood: 'calm',
        thinkingDepth: 'brief',
        dryRun: false,
        channelId: 1,
    })

    if (!(thread as any).persisted || !(thread as any).topic?.id) {
        return {
            success: false,
            phase: (thread as any).phase || 'thread_failed',
            error: (thread as any).persistError || (thread as any).error || 'Failed to create topic',
            thread,
        }
    }

    return {
        success: true,
        action: 'open',
        message: 'Philosopher topic created',
        phase: 'topic',
        topic: {
            id: String((thread as any).topic.id),
            title: String((thread as any).topic.title || briefing.primary.title),
            author: postBot,
            phase: (thread as any).phase,
        },
        briefing: {
            source: briefing.primary.source,
            title: briefing.primary.title,
            feedHits: briefing.feedHits,
        },
        providers: { topic: (thread as any).provider },
    }
}

async function replyToTopic(params: {
    topic: TickTopic
    replyBot?: string
}): Promise<TickResult> {
    const live = await loadForumThread(params.topic.id)
    const topic: TickTopic = live
        ? { id: live.id, title: live.title, author: live.author }
        : params.topic
    const exclude = live ? speakersOf(live) : [topic.author]
    const replyBot = params.replyBot || pickBot(exclude)
    const last = live?.replies[live.replies.length - 1]
    const move = pickForumMove(live?.replies.length ?? 0)
    const reply = await createForumReply({
        botUsername: replyBot,
        topicId: topic.id,
        question:
            move === 'counter'
                ? `Oppose the motion "${topic.title}" from @${topic.author}. Make the disagreement clear. Be yourself.`
                : `Your role is ${move} in "${topic.title}". Latest speaker: @${last?.author || topic.author}. Be clear and stay in character.`,
        trustedInstruction: instructionForForumMove(move),
        mood: 'passionate',
        thinkingDepth: 'brief',
        dryRun: false,
    })

    if (!(reply as any).success || !(reply as any).persisted) {
        return {
            success: false,
            phase: (reply as any).phase || 'reply_failed',
            error: (reply as any).persistError || (reply as any).error || 'Failed to persist philosopher reply',
            topic,
            reply,
        }
    }

    return {
        success: true,
        action: 'reply',
        message: 'Philosopher reply persisted against the live transcript',
        phase: 'reply',
        topic,
        reply: {
            id: (reply as any).forumReply?.id,
            author: replyBot,
            phase: (reply as any).phase,
            persisted: true,
            provider: (reply as any).provider,
        },
        providers: { reply: (reply as any).provider },
    }
}

export async function runPhilosopherBotTick(opts: TickRequest = { phase: 'full' }): Promise<TickResult> {
    try {
        const phase = opts.phase || 'full'
        const plan = await planTick()

        if (plan.kind === 'already_ticked') {
            return {
                success: true,
                skipped: true,
                action: 'skip',
                reason: 'already_ticked',
                message: 'This hour already added to the forum',
                phase,
                topic: plan.topic,
                reply: { author: 'existing', persisted: true },
            }
        }

        if (phase === 'plan') {
            if (plan.kind === 'needs_first_reply' || plan.kind === 'continue') {
                return {
                    success: true,
                    action: 'reply',
                    reason: plan.kind,
                    message:
                        plan.kind === 'continue'
                            ? 'Continue a live thread this hour'
                            : 'Topic already open; reply next',
                    phase: 'plan',
                    topic: plan.topic,
                }
            }
            return {
                success: true,
                action: 'open',
                reason: 'fresh',
                message: 'No live philosopher thread. Open a topic next.',
                phase: 'plan',
            }
        }

        if (phase === 'topic') {
            if (plan.kind === 'needs_first_reply' || plan.kind === 'continue') {
                return {
                    success: true,
                    skipped: true,
                    action: 'reply',
                    reason: plan.kind === 'continue' ? 'continue_thread' : 'topic_already_open',
                    message:
                        plan.kind === 'continue'
                            ? 'Continuing a live thread this hour'
                            : 'Topic already open this hour; waiting for reply phase',
                    phase: 'topic',
                    topic: plan.topic,
                }
            }
            return openTopic({ postBot: opts.postBot, briefing: opts.briefing })
        }

        if (phase === 'reply') {
            const topic =
                opts.topicId
                    ? {
                          id: opts.topicId,
                          title: opts.topicTitle || '',
                          author: opts.postBot || 'unknown',
                      }
                    : plan.kind === 'needs_first_reply' || plan.kind === 'continue'
                      ? plan.topic
                      : null
            if (!topic) {
                return {
                    success: false,
                    phase: 'reply',
                    error: 'No live philosopher thread to reply to',
                }
            }
            return replyToTopic({ topic, replyBot: opts.replyBot })
        }

        if (plan.kind === 'needs_first_reply' || plan.kind === 'continue') {
            return replyToTopic({ topic: plan.topic, replyBot: opts.replyBot })
        }

        const opened = await openTopic({ postBot: opts.postBot })
        if (!opened.success || !opened.topic) return opened
        const replied = await replyToTopic({
            topic: opened.topic,
            replyBot: opts.replyBot,
        })
        if (!replied.success) return { ...replied, topic: opened.topic }
        return {
            success: true,
            message: 'Philosopher bot tick completed (briefing + transcript + persist)',
            phase: 'full',
            topic: opened.topic,
            reply: replied.reply,
            briefing: opened.briefing,
            providers: {
                topic: opened.providers?.topic,
                reply: replied.providers?.reply,
            },
        }
    } catch (err: any) {
        return { success: false, phase: opts.phase || 'full', error: err?.message || 'cron failed' }
    }
}
