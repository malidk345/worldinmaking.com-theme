/**
 * Durable bot task queue. Edge endpoints may enqueue; a worker claims rows.
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
    idempotency_key?: string | null
}

export function philosopherTickIdempotencyKey(phase: string, topicId?: string): string {
    const hour = new Date().toISOString().slice(0, 13)
    const topic = topicId ? `:${topicId}` : ''
    return `philosopher_tick:${hour}:${phase || 'full'}${topic}`
}

export async function enqueueBotTask(
    taskType: string,
    payload: Record<string, unknown>,
    idempotencyKey?: string
): Promise<string> {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()
    const key = idempotencyKey || null

    if (key) {
        const { data: existing } = await supabaseAdmin
            .from('wim_bot_tasks')
            .select('id')
            .eq('idempotency_key', key)
            .maybeSingle()
        if (existing?.id) return existing.id as string
    }

    const { data, error } = await supabaseAdmin
        .from('wim_bot_tasks')
        .insert({
            id,
            task_type: taskType,
            payload,
            status: 'pending',
            created_at: now,
            updated_at: now,
            idempotency_key: key,
        })
        .select('id')
        .maybeSingle()

    if (error) {
        if (key && /duplicate|unique/i.test(error.message)) {
            const { data: again } = await supabaseAdmin
                .from('wim_bot_tasks')
                .select('id')
                .eq('idempotency_key', key)
                .maybeSingle()
            if (again?.id) return again.id as string
        }
        throw error
    }
    return (data?.id as string) || id
}

export async function popPendingBotTasks(limit = 5): Promise<BotQueueTask[]> {
    const claimed: BotQueueTask[] = []
    for (let i = 0; i < limit; i++) {
        const { data: pending, error: findError } = await supabaseAdmin
            .from('wim_bot_tasks')
            .select('id')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()
        if (findError) throw findError
        if (!pending?.id) break

        const { data, error } = await supabaseAdmin
            .from('wim_bot_tasks')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', pending.id)
            .eq('status', 'pending')
            .select('*')
            .maybeSingle()
        if (error) throw error
        if (data) claimed.push(data as BotQueueTask)
    }
    return claimed
}

export async function markBotTaskComplete(id: string, success: boolean, errorMsg?: string): Promise<void> {
    const status = success ? 'completed' : 'failed'
    const { error } = await supabaseAdmin
        .from('wim_bot_tasks')
        .update({
            status,
            updated_at: new Date().toISOString(),
            error: errorMsg || null,
        })
        .eq('id', id)
    if (error) throw error
}
