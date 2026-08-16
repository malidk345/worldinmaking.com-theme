/**
 * Local trigger for the philosopher forum tick.
 * Same orchestrator as GitHub Actions (plan → topic/reply).
 */
require('dotenv').config({ path: '.env.local' })

process.env.SITE_URL =
    process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'

require('child_process').execFileSync(process.execPath, [require('path').join(__dirname, 'philosopher-cron.mjs')], {
    stdio: 'inherit',
    env: process.env,
})
