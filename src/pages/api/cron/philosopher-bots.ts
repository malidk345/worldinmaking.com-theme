/**
 * Hourly (or on-demand) philosopher forum tick.
 * Uses shared bot gateway + forum actions (thinking process + Supabase persist).
 */


import { createForumReply, createForumTopic } from 'lib/bots/actions/forum'
import { checkRateLimit } from 'lib/bots/rate-limit'
import { envFrom, getRuntimeEnv } from 'lib/bots/runtime-env'

const BOT_ROSTER = [
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

const FALLBACK_TOPICS = [
    'The Dialectics of Artificial Intelligence and Human Agency',
    'Technological Enframing: Is Software Redefining Human Essence?',
    'Hyperreality and Modern Web Application Interfaces',
    'Ideological State Apparatuses in Algorithmic Feed Curation',
    'Deconstructing Asynchronous State Management and Binary Truth',
    'The Will to Power in Technological Monopoly and Automation',
    'Formal Rationalization and the Iron Cage of Optimization',
    'Surplus Value and Alienation of Labor in Open Source Software',
]

const RSS_FEEDS = [
    'https://aeon.co/feed.rss',
    'https://plato.stanford.edu/rss/sep.xml',
    'https://restofworld.org/feed/latest/',
    'https://www.lesswrong.com/feed.xml',
    'https://www.alignmentforum.org/feed.xml',
]

function pickBot(exclude?: string): string {
    const pool = exclude ? BOT_ROSTER.filter((b) => b !== exclude.toLowerCase()) : [...BOT_ROSTER]
    return pool[Math.floor(Math.random() * pool.length)] || 'nietzsche'
}

async function fetchRSSTopic(): Promise<string> {
    for (const url of RSS_FEEDS) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8_000)
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorldInMakingBot/1.0)' },
                signal: controller.signal,
            })
            if (!res.ok) continue
            const xml = await res.text()
            if (xml.length > 1_000_000) continue
            const matches = xml.match(/<title[^>]*>([\s\S]*?)<\/title>/gi)
            if (!matches || matches.length < 2) continue
            const rawTitles = matches
                .slice(1)
                .map((t) =>
                    t
                        .replace(/<[^>]+>/g, '')
                        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
                        .trim()
                )
                .filter(
                    (t) =>
                        t.length > 15 &&
                        !t.toLowerCase().includes('rss') &&
                        !t.toLowerCase().includes('aeon') &&
                        !t.toLowerCase().includes('stanford')
                )
            if (rawTitles.length > 0) {
                const selected = rawTitles[Math.floor(Math.random() * rawTitles.length)]!
                return selected
            }
        } catch (e: any) {
            console.warn(`[RSS Feed] ${url}:`, e?.message)
        } finally {
            clearTimeout(timeout)
        }
    }
    return FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)]!
}

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    // Mutating endpoint: only POST is allowed (a GET must never trigger writes).
    if (req.method !== 'POST') {
        return json({ success: false, error: 'Method not allowed' }, 405)
    }

    // Secret check: when CRON_SECRET is configured it is REQUIRED — missing or
    // mismatched headers are rejected, otherwise the tick would run publicly.
    const env = getRuntimeEnv()
    const secret = envFrom(env, 'CRON_SECRET', 'BOT_ACT_SECRET')
    if (!secret) {
        return json({ success: false, error: 'Cron secret is not configured' }, 503)
    }
    const header =
        req.headers.get('x-cron-secret') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
        ''
    if (header !== secret) {
        return json({ success: false, error: 'Unauthorized: x-cron-secret required' }, 401)
    }

    const rl = checkRateLimit('cron:philosopher-bots', 12, 60 * 60 * 1000)
    if (!rl.allowed) {
        return json(
            {
                success: false,
                error: 'Rate limited',
                retryAfterSec: rl.retryAfterSec,
            },
            429
        )
    }

    const result = await runPhilosopherBotTick()
    return json(result, result.success ? 200 : 502)
}

export async function runPhilosopherBotTick() {
    try {
        const topic = await fetchRSSTopic()
        const postBot = pickBot()
        const replyBot = pickBot(postBot)

        // 1) Thread init via shared gateway + forum persist
        const thread = await createForumTopic({
            botUsername: postBot,
            question: `Open a philosophical forum discussion on: "${topic}". Write a compelling title as the first line, then a short profound opening post.`,
            mood: 'calm',
            thinkingDepth: 'standard',
            dryRun: false,
            channelId: 1,
        })

        if (!(thread as any).persisted || !(thread as any).topic?.id) {
            return {
                success: false as const,
                phase: (thread as any).phase || 'thread_failed',
                error: (thread as any).persistError || (thread as any).error || 'Failed to create topic',
                thread,
            }
        }

        const topicId = String((thread as any).topic.id)
        const title = String((thread as any).topic.title || topic)

        // 2) Contrasting bot replies with thinking process
        const reply = await createForumReply({
            botUsername: replyBot,
            topicId,
            question: `Read @${postBot}'s opening on "${title}" and reply with a rigorous counter-position in your voice.`,
            mood: 'passionate',
            thinkingDepth: 'standard',
            dryRun: false,
        })

        if (!(reply as any).success || !(reply as any).persisted) {
            return {
                success: false as const,
                phase: (reply as any).phase || 'reply_failed',
                error: (reply as any).persistError || (reply as any).error || 'Failed to persist philosopher reply',
                topic: { id: topicId, title, author: postBot, phase: (thread as any).phase },
                reply,
            }
        }

        return {
            success: true as const,
            message: 'Philosopher bot tick completed (gateway + thinking + persist)',
            topic: {
                id: topicId,
                title,
                author: postBot,
                phase: (thread as any).phase,
            },
            reply: {
                id: (reply as any).forumReply?.id,
                author: replyBot,
                phase: (reply as any).phase,
                persisted: !!(reply as any).persisted,
                provider: (reply as any).provider,
            },
            providers: {
                topic: (thread as any).provider,
                reply: (reply as any).provider,
            },
        }
    } catch (err: any) {
        return { success: false as const, error: err?.message || 'cron failed' }
    }
}
