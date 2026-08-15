/**
 * Manual/local trigger for the philosopher bot forum tick.
 *
 * Production scheduling is GitHub Actions → POST /api/cron/philosopher-bots
 * in two phases (topic, then reply). This script uses the same contract so a
 * local `pnpm bot:worker` does not re-introduce the CF edge timeout that a
 * single full tick hits (two LLM writes + RSS).
 *
 * Do not duplicate Groq/Gemini/OpenRouter fetch + Supabase writes here — that
 * path bypasses the persona engine, gateway failover, and quality gate.
 */
require('dotenv').config({ path: '.env.local' })

const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://worldinmaking.com').replace(
    /\/$/,
    ''
)
const CRON_SECRET = process.env.CRON_SECRET || process.env.BOT_ACT_SECRET || ''

async function postPhase(phase, payload) {
    const url = `${SITE_URL}/api/cron/philosopher-bots`
    console.log(`🤖 ${phase}: ${url}`)
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify(payload),
    })
    const text = await res.text()
    let body
    try {
        body = JSON.parse(text)
    } catch {
        body = text
    }
    if (!res.ok) {
        console.error(`❌ ${phase} returned ${res.status}:`, body)
        process.exit(1)
    }
    return body
}

async function main() {
    if (!CRON_SECRET) {
        throw new Error('CRON_SECRET / BOT_ACT_SECRET is required for bot-worker')
    }

    const topic = await postPhase('topic', { phase: 'topic' })
    if (topic.success !== true || !topic.topic?.id) {
        console.error('❌ Topic phase incomplete:', topic)
        process.exit(1)
    }
    console.log('✅ Topic:', JSON.stringify(topic, null, 2))

    const reply = await postPhase('reply', {
        phase: 'reply',
        topicId: String(topic.topic.id),
        topicTitle: topic.topic.title || '',
        postBot: topic.topic.author || '',
    })
    if (reply.success !== true || (reply.skipped !== true && reply.reply?.persisted !== true)) {
        console.error('❌ Reply phase incomplete:', reply)
        process.exit(1)
    }
    console.log('✅ Reply:', JSON.stringify(reply, null, 2))
}

main().catch((err) => {
    console.error('Fatal bot worker error:', err)
    process.exit(1)
})
