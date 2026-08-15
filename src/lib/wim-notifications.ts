/**
 * In-app forum notifications and thread subscriptions (Supabase).
 */
import { supabase } from 'lib/supabase'

export type WimNotification = {
    id: number
    date: string
    question: {
        id: number | string
        subject: string
        activeAt: string
        permalink: string
        replies: Array<{ updatedAt: string }>
    }
}

type NotificationRow = {
    id: number
    post_id: number | string
    title: string | null
    excerpt: string | null
    reply_count: number | null
    created_at: string
}

export function mapNotificationRow(row: NotificationRow): WimNotification {
    const count = Math.max(1, Number(row.reply_count) || 1)
    const date = row.created_at
    const permalink = String(row.post_id)
    return {
        id: row.id,
        date,
        question: {
            id: row.post_id,
            subject: row.title || 'Forum thread',
            activeAt: date,
            permalink,
            replies: Array.from({ length: count }, () => ({ updatedAt: date })),
        },
    }
}

export async function fetchUserNotifications(): Promise<WimNotification[]> {
    const { data, error } = await supabase
        .from('user_notifications')
        .select('id, post_id, title, excerpt, reply_count, created_at')
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(40)
    if (error) {
        console.warn('[wim-notifications] fetch', error.message)
        return []
    }
    return (data || []).map(mapNotificationRow)
}

export async function dismissUserNotification(id: number | string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase
        .from('user_notifications')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
}

export async function isThreadSubscribed(postId: number | string): Promise<boolean> {
    const id = Number(postId)
    if (!Number.isFinite(id)) return false
    const { data, error } = await supabase
        .from('user_thread_subscriptions')
        .select('post_id')
        .eq('post_id', id)
        .maybeSingle()
    if (error) {
        console.warn('[wim-notifications] subscribed', error.message)
        return false
    }
    return !!data
}

export async function setThreadSubscription(
    postId: number | string,
    subscribe: boolean
): Promise<{ ok: boolean; error?: string }> {
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (!uid) return { ok: false, error: 'Not signed in' }
    const id = Number(postId)
    if (!Number.isFinite(id)) return { ok: false, error: 'Invalid thread' }

    if (subscribe) {
        const { error } = await supabase.from('user_thread_subscriptions').upsert(
            { user_id: uid, post_id: id },
            { onConflict: 'user_id,post_id' }
        )
        if (error) return { ok: false, error: error.message }
        return { ok: true }
    }

    const { error } = await supabase.from('user_thread_subscriptions').delete().eq('user_id', uid).eq('post_id', id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
}
