/**
 * Drain wim_bot_tasks. Same CRON_SECRET as philosopher-bots.
 * Does not replace GitHub's synchronous hourly tick.
 */
export const runtime = 'edge'

import { envFrom, getRuntimeEnv } from 'lib/bots/runtime-env'
import { markBotTaskComplete, popPendingBotTasks } from 'lib/bots/bot-queue'
import { runPhilosopherBotTick } from 'lib/bots/philosopher-tick'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

    const env = getRuntimeEnv()
    const secret = envFrom(env, 'CRON_SECRET', 'BOT_ACT_SECRET')
    if (!secret) return json({ success: false, error: 'Cron secret is not configured' }, 503)
    const header =
        req.headers.get('x-cron-secret') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
        ''
    if (header !== secret) return json({ success: false, error: 'Unauthorized' }, 401)

    const tasks = await popPendingBotTasks(5)
    const results: Array<{ id: string; ok: boolean; error?: string }> = []
    for (const task of tasks) {
        try {
            if (task.task_type === 'philosopher_tick') {
                const tickReq = (task.payload as { tickReq?: unknown })?.tickReq || task.payload
                await runPhilosopherBotTick(tickReq as any)
            }
            await markBotTaskComplete(task.id, true)
            results.push({ id: task.id, ok: true })
        } catch (err: any) {
            await markBotTaskComplete(task.id, false, err?.message || 'failed')
            results.push({ id: task.id, ok: false, error: err?.message || 'failed' })
        }
    }

    return json({ success: true, claimed: tasks.length, results })
}
