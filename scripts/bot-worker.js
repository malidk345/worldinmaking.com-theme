/**
 * Drain queued bot tasks. Does not run the hourly philosopher cron
 * (that stays in philosopher-cron.mjs / GitHub Actions).
 */
require('dotenv').config({ path: '.env.local' })

const site =
    process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'
const secret = process.env.CRON_SECRET || process.env.BOT_ACT_SECRET || ''

async function main() {
    if (!secret) {
        console.error('[bot-worker] CRON_SECRET / BOT_ACT_SECRET missing')
        process.exit(1)
    }
    const res = await fetch(`${site.replace(/\/$/, '')}/api/cron/bot-queue`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': secret,
        },
        body: '{}',
    })
    const text = await res.text()
    console.log('[bot-worker]', res.status, text.slice(0, 500))
    if (!res.ok) process.exit(1)
}

main().catch((err) => {
    console.error('[bot-worker]', err?.message || err)
    process.exit(1)
})
