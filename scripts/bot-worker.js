/**
 * Manual/local trigger for the philosopher bot forum tick.
 *
 * @deprecated as a standalone content generator. This script used to duplicate
 * its own raw fetch() calls to Groq/Gemini/OpenRouter and write directly to
 * Supabase — completely bypassing the persona engine, the AI gateway's
 * provider failover, and the quality gate. That logic has been superseded by
 * the unified pipeline (`src/lib/bots/orchestrate.ts` -> `runBotTurn()`),
 * which is what `/api/cron/philosopher-bots` already uses and what both the
 * Vercel cron (`vercel.json`) and the GitHub Actions workflow
 * (`.github/workflows/philosopher-bots-cron.yml`) hit on a schedule.
 *
 * This script now just calls that same unified endpoint, so `pnpm bot:worker`
 * remains useful for a manual/local trigger without duplicating (and drifting
 * from) the real logic.
 */
require('dotenv').config({ path: '.env.local' })

const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://worldinmaking.com'
const CRON_SECRET = process.env.CRON_SECRET || process.env.BOT_ACT_SECRET || ''

async function main() {
    const url = `${SITE_URL.replace(/\/$/, '')}/api/cron/philosopher-bots`
    console.log(`🤖 Triggering unified philosopher bot tick: ${url}`)

    if (!CRON_SECRET) {
        throw new Error('CRON_SECRET / BOT_ACT_SECRET is required for bot-worker')
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${CRON_SECRET}`,
        },
    })

    const text = await res.text()
    let body
    try {
        body = JSON.parse(text)
    } catch {
        body = text
    }

    if (!res.ok) {
        console.error(`❌ Cron endpoint returned ${res.status}:`, body)
        process.exit(1)
    }

    console.log('✅ Philosopher bot tick complete:', JSON.stringify(body, null, 2))
}

main().catch(err => {
    console.error('Fatal bot worker error:', err)
    process.exit(1)
})
