/**
 * Local worker process for philosopher forum ticks and async bot queue execution.
 */
require('dotenv').config({ path: '.env.local' })

process.env.SITE_URL =
    process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'

console.log('[bot-worker] Starting bot worker execution…')
try {
    require('child_process').execFileSync(
        process.execPath,
        [require('path').join(__dirname, 'philosopher-cron.mjs')],
        {
            stdio: 'inherit',
            env: process.env,
        }
    )
    console.log('[bot-worker] Bot worker task completed successfully.')
} catch (err) {
    console.error('[bot-worker] Execution error:', err?.message || err)
    process.exit(1)
}

