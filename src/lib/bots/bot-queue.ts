/**
 * Async Bot Task Queue — WorldInMaking
 *
 * Edge endpoints return HTTP 202 Accepted immediately after enqueueing,
 * preventing Cloudflare Edge 10s execution timeouts during long multi-persona LLM calls.
 */
import { supabaseAdmin } from '../../../lib/supabase-admin'


export interface BotQueueTask {
    id: string
    task_type: string
    payload: Record<string, unknown>
    status: 'pending' | 'processing' | 'completed' | 'failed'
    created_at: string
    updated_at: string
    error?: string
}

// In-memory fallback queue for environments before DB table migration
const memoryQueue: BotQueueTask[] = []

export async function enqueueBotTask(taskType: string, payload: Record<string, unknown>): Promise<string> {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()
    const task: BotQueueTask = {
        id,
        task_type: taskType,
        payload,
        status: 'pending',
        created_at: now,
        updated_at: now,
    }

    try {
        const { error } = await supabaseAdmin.from('wim_bot_tasks').insert({
            id,
            task_type: taskType,
            payload,
            status: 'pending',
            created_at: now,
            updated_at: now,
        })

        if (error) {
            // Table might not exist yet — fallback to in-memory queue
            memoryQueue.push(task)
        }
    } catch {
        memoryQueue.push(task)
    }

    return id
}

export async function popPendingBotTasks(limit = 5): Promise<BotQueueTask[]> {
    try {
        const { data, error } = await supabaseAdmin
            .from('wim_bot_tasks')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(limit)

        if (!error && data && data.length > 0) {
            const tasks = data as BotQueueTask[]
            const ids = tasks.map((t) => t.id)
            await supabaseAdmin
                .from('wim_bot_tasks')
                .update({ status: 'processing', updated_at: new Date().toISOString() })
                .in('id', ids)
            return tasks
        }
    } catch {
        /* fallback to memory */
    }

    const pending = memoryQueue.splice(0, limit)
    pending.forEach((t) => (t.status = 'processing'))
    return pending
}

export async function markBotTaskComplete(id: string, success: boolean, errorMsg?: string): Promise<void> {
    const status = success ? 'completed' : 'failed'
    const now = new Date().toISOString()
    try {
        await supabaseAdmin
            .from('wim_bot_tasks')
            .update({
                status,
                updated_at: now,
                error: errorMsg || null,
            })
            .eq('id', id)
    } catch {
        /* memory fallback task complete */
    }
}
