/**
 * Orchestrates the hourly philosopher tick from GitHub Actions.
 *
 * Cloudflare Pages cannot do RSS fan-out + LLM in one isolate (returns
 * the literal text "error code: 502"). This script:
 *   1. POST plan  — Supabase only
 *   2. If open:   optional 1–2 RSS fetches HERE, then POST topic
 *   3. If reply:  POST reply
 *
 * Empty forum → plan.action=open → first community_posts row. That is correct.
 */
const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://worldinmaking.com').replace(
    /\/$/,
    ''
)
const CRON_SECRET = process.env.CRON_SECRET || process.env.BOT_ACT_SECRET || ''

const FALLBACK = {
    title: 'Should recommendation feeds count as a public square?',
    source: 'worldinmaking.fallback',
    excerpt: 'No live feed excerpt was available. Treat this title as a provocation, not as reported fact.',
}

async function postPhase(phase, payload, attempt = 1) {
    const url = `${SITE_URL}/api/cron/philosopher-bots`
    console.log(`POST phase=${phase} attempt=${attempt}`)
    let res
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${CRON_SECRET}`,
                'x-cron-secret': CRON_SECRET,
                'Content-Type': 'application/json',
                'User-Agent': 'WorldInMakingCron/1.0',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(70_000),
        })
    } catch (err) {
        if (attempt < 3) {
            console.warn(`phase=${phase} network ${err.message}; retry`)
            await new Promise((r) => setTimeout(r, 8000))
            return postPhase(phase, payload, attempt + 1)
        }
        throw err
    }

    const text = await res.text()
    console.log(`http=${res.status} bytes=${text.length}`)
    const trimmed = text.trim()
    if (!trimmed.startsWith('{')) {
        if (attempt < 3) {
            console.warn(`phase=${phase} non-JSON (${trimmed.slice(0, 120)}); retry`)
            await new Promise((r) => setTimeout(r, 8000))
            return postPhase(phase, payload, attempt + 1)
        }
        throw new Error(`phase=${phase} non-JSON: ${trimmed.slice(0, 200)}`)
    }

    const body = JSON.parse(trimmed)
    if (res.status === 401 || res.status === 503) {
        throw new Error(body.error || `auth ${res.status}`)
    }
    return body
}

async function fetchBriefing() {
    const feeds = ['https://hnrss.org/frontpage', 'https://aeon.co/feed.rss']
    for (const url of feeds) {
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'WorldInMakingCron/1.0' },
                signal: AbortSignal.timeout(4000),
            })
            if (!res.ok) continue
            const xml = await res.text()
            const item = xml.match(/<item[\s\S]*?<\/item>/i)
            if (!item) continue
            const title = (item[0].match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]
            const desc = (item[0].match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1]
            const clean = (s = '') =>
                s
                    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
            const headline = clean(title)
            if (headline.length < 12) continue
            return {
                primary: {
                    title: headline,
                    source: new URL(url).hostname.replace(/^www\./, ''),
                    excerpt: clean(desc).slice(0, 280),
                },
                related: [],
                feedHits: 1,
                itemCount: 1,
                usedFallback: false,
            }
        } catch {
            /* next feed */
        }
    }
    return {
        primary: FALLBACK,
        related: [],
        feedHits: 0,
        itemCount: 0,
        usedFallback: true,
    }
}

async function main() {
    if (!CRON_SECRET) {
        throw new Error(
            'CRON_SECRET is empty. Add it as a GitHub Actions repository secret (Settings → Secrets and variables → Actions). Use the same value as Cloudflare Pages CRON_SECRET / .env.local. Do not put Groq or Supabase keys here.'
        )
    }
    console.log(`site=${SITE_URL} secret_len=${CRON_SECRET.length}`)

    const plan = await postPhase('plan', { phase: 'plan' })
    if (plan.success !== true) {
        throw new Error(`plan failed: ${plan.error || JSON.stringify(plan)}`)
    }
    console.log(`plan action=${plan.action || '?'} reason=${plan.reason || ''}`)

    if (plan.action === 'skip' || plan.reason === 'already_ticked') {
        console.log('skip: already ticked this hour')
        return
    }

    let topic = plan.topic
    if (plan.action === 'open' || !topic?.id) {
        const briefing = await fetchBriefing()
        console.log(`briefing ${briefing.primary.source}: ${briefing.primary.title}`)
        const opened = await postPhase('topic', { phase: 'topic', briefing })
        if (opened.success !== true || !opened.topic?.id) {
            throw new Error(`topic failed: ${opened.error || opened.phase || JSON.stringify(opened)}`)
        }
        topic = opened.topic
        console.log(`topic_ok id=${topic.id} author=${topic.author || ''}`)
    } else {
        console.log(`reuse topic id=${topic.id}`)
    }

    const reply = await postPhase('reply', {
        phase: 'reply',
        topicId: String(topic.id),
        topicTitle: topic.title || '',
        postBot: topic.author || '',
    })
    if (reply.success !== true) {
        throw new Error(`reply failed: ${reply.error || reply.phase || JSON.stringify(reply)}`)
    }
    if (reply.skipped !== true && reply.reply && reply.reply.persisted !== true) {
        throw new Error('reply was not persisted')
    }
    if (reply.skipped !== true && !reply.reply) {
        throw new Error('reply phase returned no reply')
    }
    console.log(`reply_ok skipped=${!!reply.skipped} persisted=${!!(reply.reply && reply.reply.persisted)}`)
}

main().catch((err) => {
    console.error(err.message || err)
    process.exit(1)
})
