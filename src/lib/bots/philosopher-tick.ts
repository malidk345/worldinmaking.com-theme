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
    fetchRssBriefing,
    formatRssBriefing,
    titlesFromRssXml,
} from './forum-rss'
import {
    FORUM_CONTINUE_WINDOW_MS,
    FORUM_HOUR_LOCK_MS,
    FORUM_OPEN_INSTRUCTION,
    FORUM_REPLY_INSTRUCTION,
    authorFromRow,
    loadBotNameMap,
    loadForumThread,
    shouldContinueThread,
    speakersOf,
} from './forum-thread'
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

export type TickPhase = 'full' | 'topic' | 'reply'

export type TickRequest = {
    phase: TickPhase
    topicId?: string
    topicTitle?: string
    postBot?: string
    replyBot?: string
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

export function parseTickRequest(body: unknown, url?: URL): TickRequest {
    const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
    const fromQuery = url?.searchParams.get('phase')
    const phaseRaw = String(raw.phase || fromQuery || 'full').toLowerCase()
    const phase: TickPhase = phaseRaw === 'topic' || phaseRaw === 'reply' ? phaseRaw : 'full'
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
    if (!posts.ok || !Array.isArray(posts.data) || posts.data.length === 0) {
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

async function openTopic(params: { postBot?: string }): Promise<TickResult> {
    const briefing = await fetchRssBriefing()
    const postBot = params.postBot || pickBot()
    const thread = await createForumTopic({
        botUsername: postBot,
        question: `Open a public forum thread from this briefing. Title on line 1. First paragraph names the source and what actually happened or was claimed. Then one concrete objection — not a metaphysical lecture.`,
        context: formatRssBriefing(briefing),
        trustedInstruction: FORUM_OPEN_INSTRUCTION,
        mood: 'calm',
        thinkingDepth: 'standard',
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
        message: 'Philosopher topic created from RSS briefing',
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
    const reply = await createForumReply({
        botUsername: replyBot,
        topicId: topic.id,
        question: last
            ? `Reply to @${last.author} in "${topic.title}". First say which line you are answering, then refuse one concrete claim. Stay with the case @${topic.author} opened.`
            : `Read @${topic.author}'s opening on "${topic.title}". Name the case, then refuse one claim. Do not deliver a lecture.`,
        trustedInstruction: FORUM_REPLY_INSTRUCTION,
        mood: 'passionate',
        thinkingDepth: 'standard',
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
                reason: 'already_ticked',
                message: 'This hour already added to the forum',
                phase,
                topic: plan.topic,
                reply: { author: 'existing', persisted: true },
            }
        }

        if (phase === 'topic') {
            if (plan.kind === 'needs_first_reply' || plan.kind === 'continue') {
                return {
                    success: true,
                    skipped: true,
                    reason: plan.kind === 'continue' ? 'continue_thread' : 'topic_already_open',
                    message:
                        plan.kind === 'continue'
                            ? 'Continuing a live thread this hour'
                            : 'Topic already open this hour; waiting for reply phase',
                    phase: 'topic',
                    topic: plan.topic,
                }
            }
            return openTopic({ postBot: opts.postBot })
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
