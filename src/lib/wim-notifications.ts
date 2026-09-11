/**
 * In-app notifications and thread subscriptions (Supabase).
 * Supports:
 * - Forum question replies (human)
 * - Philosopher bot replies & mentions
 * - WIM Notebook collaboration invites & collaborator additions
 * - Personal assistant nags / questions / counsel (local, same panel shape)
 */
import { supabase } from 'lib/supabase'
import { matchPhilosopherId } from './philosopher-avatar'
import { dismissAssistantNotice, isAssistantNoticeId, listAssistantNotifications } from './assistant-notices'
import { PHILOSOPHER_BOTS } from '../notebook-app/lib/philosophers'

export type WimNotification = {
    id: number | string
    date: string
    question?: {
        id: number | string
        subject: string
        activeAt: string
        permalink: string
        replies: Array<{ updatedAt: string }>
    }
    context?: {
        count: number | string
        title: string
        excerpt: string
        date: string
        url: string
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

const DISMISSED_NOTEBOOK_NOTIFICATIONS_KEY = 'wim_dismissed_notebook_notes'

function getDismissedNotebookNotificationIds(): Set<string> {
    if (typeof window === 'undefined') return new Set()
    try {
        const raw = localStorage.getItem(DISMISSED_NOTEBOOK_NOTIFICATIONS_KEY)
        if (!raw) return new Set()
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return new Set(parsed.map(String))
    } catch {
        /* ignore */
    }
    return new Set()
}

function markDismissedNotebookNotificationId(id: string): void {
    if (typeof window === 'undefined') return
    try {
        const set = getDismissedNotebookNotificationIds()
        set.add(String(id))
        const arr = Array.from(set).slice(-200)
        localStorage.setItem(DISMISSED_NOTEBOOK_NOTIFICATIONS_KEY, JSON.stringify(arr))
    } catch {
        /* ignore */
    }
}

function resolveBotDisplayName(authorName?: string | null): string | null {
    if (!authorName) return null
    const botId = matchPhilosopherId(authorName)
    if (botId) {
        const found = PHILOSOPHER_BOTS.find((b) => b.id === botId)
        if (found?.name) return found.name
    }
    const lower = authorName.trim().toLowerCase()
    const foundByName = PHILOSOPHER_BOTS.find(
        (b) => b.name.toLowerCase() === lower || b.id.toLowerCase() === lower
    )
    if (foundByName?.name) return foundByName.name
    return null
}

function resolvePersonDisplayName(profile?: {
    first_name?: string | null
    last_name?: string | null
    username?: string | null
} | null): string {
    if (!profile) return 'Someone'
    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
    if (fullName) return fullName
    if (profile.username?.trim()) return profile.username.trim()
    return 'Someone'
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
    const forumNotifications: WimNotification[] = []
    const notebookNotifications: WimNotification[] = []

    try {
        // 1. Fetch forum & philosopher notifications
        const { data: notifRows, error: notifError } = await supabase
            .from('user_notifications')
            .select('id, post_id, title, excerpt, reply_count, created_at')
            .is('dismissed_at', null)
            .order('created_at', { ascending: false })
            .limit(40)

        if (notifError) {
            console.warn('[wim-notifications] fetch user_notifications', notifError.message)
        } else if (notifRows && notifRows.length > 0) {
            const postIds = notifRows.map((r) => r.post_id).filter(Boolean)

            let latestRepliesByPost = new Map<string, { author_name?: string | null; author_id?: string | null }>()
            let botAuthorIds = new Set<string>()

            try {
                const { data: replies } = await supabase
                    .from('community_replies')
                    .select('id, post_id, author_id, author_name, created_at')
                    .in('post_id', postIds)
                    .order('created_at', { ascending: false })
                    .limit(100)

                for (const rep of replies || []) {
                    const key = String(rep.post_id)
                    if (!latestRepliesByPost.has(key)) {
                        latestRepliesByPost.set(key, { author_name: rep.author_name, author_id: rep.author_id })
                    }
                }

                const authorIds = Array.from(
                    new Set((replies || []).map((r) => r.author_id).filter(Boolean))
                )
                if (authorIds.length > 0) {
                    const { data: botProfiles } = await supabase
                        .from('profiles')
                        .select('id')
                        .in('id', authorIds)
                        .eq('is_bot', true)
                    if (botProfiles) {
                        botAuthorIds = new Set(botProfiles.map((p) => p.id))
                    }
                }
            } catch (err) {
                console.warn('[wim-notifications] fetch replies metadata', err)
            }

            for (const row of notifRows) {
                const key = String(row.post_id)
                const latestReply = latestRepliesByPost.get(key)
                const botName =
                    resolveBotDisplayName(latestReply?.author_name) ||
                    (latestReply?.author_id && botAuthorIds.has(latestReply.author_id)
                        ? latestReply.author_name || 'Philosopher'
                        : null)

                const count = Math.max(1, Number(row.reply_count) || 1)
                const date = row.created_at
                const url = `/questions/${row.post_id}`
                const threadTitle = row.title || 'Forum thread'
                const isMention = row.excerpt === 'Mentioned you'

                if (botName) {
                    forumNotifications.push({
                        id: row.id,
                        date,
                        context: {
                            excerpt: 'Philosopher',
                            title: isMention
                                ? `${botName} mentioned you in "${threadTitle}"`
                                : `${botName} replied to "${threadTitle}"`,
                            count: `${count} new repl${count === 1 ? 'y' : 'ies'}`,
                            date,
                            url,
                        },
                    })
                } else {
                    forumNotifications.push({
                        id: row.id,
                        date,
                        context: {
                            excerpt: 'Question',
                            title: isMention ? `Mentioned you in "${threadTitle}"` : threadTitle,
                            count: isMention ? 'Mention' : `${count} new repl${count === 1 ? 'y' : 'ies'}`,
                            date,
                            url,
                        },
                    })
                }
            }
        }
    } catch (err) {
        console.warn('[wim-notifications] error processing forum notifications', err)
    }

    // 2. Fetch notebook collaboration invites & additions
    try {
        const { data: authData } = await supabase.auth.getSession()
        const userId = authData.session?.user?.id

        if (userId) {
            const dismissedIds = getDismissedNotebookNotificationIds()

            // A) Pending invites for current user
            const { data: invites, error: invitesError } = await supabase
                .from('wim_notebook_invites')
                .select('id, notebook_id, token, role, invited_by, created_at, expires_at')
                .eq('invited_user_id', userId)
                .is('accepted_at', null)
                .is('revoked_at', null)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(20)

            if (invitesError) {
                console.warn('[wim-notifications] fetch notebook invites', invitesError.message)
            }

            // B) Direct collaborator additions
            const { data: collabs, error: collabsError } = await supabase
                .from('wim_notebook_collaborators')
                .select('id, notebook_id, role, invited_by, created_at')
                .eq('user_id', userId)
                .not('invited_by', 'is', null)
                .order('created_at', { ascending: false })
                .limit(20)

            if (collabsError) {
                console.warn('[wim-notifications] fetch notebook collabs', collabsError.message)
            }

            const filteredInvites = (invites || []).filter((i) => !dismissedIds.has(`invite_${i.id}`))
            const filteredCollabs = (collabs || []).filter((c) => !dismissedIds.has(`collab_${c.id}`))

            const inviterIds = Array.from(
                new Set([
                    ...filteredInvites.map((i) => i.invited_by),
                    ...filteredCollabs.map((c) => c.invited_by),
                ].filter(Boolean))
            )

            let inviterMap = new Map<string, string>()
            if (inviterIds.length > 0) {
                const { data: inviterProfiles } = await supabase
                    .from('profiles')
                    .select('id, username, first_name, last_name')
                    .in('id', inviterIds)
                for (const p of inviterProfiles || []) {
                    inviterMap.set(p.id, resolvePersonDisplayName(p))
                }
            }

            const collabNotebookIds = filteredCollabs.map((c) => c.notebook_id).filter(Boolean)
            let notebookTitles = new Map<string, string>()
            if (collabNotebookIds.length > 0) {
                const { data: notebooks } = await supabase
                    .from('wim_notebooks')
                    .select('id, title')
                    .in('id', collabNotebookIds)
                for (const nb of notebooks || []) {
                    notebookTitles.set(nb.id, nb.title || 'Untitled Notebook')
                }
            }

            for (const inv of filteredInvites) {
                const inviter = inviterMap.get(inv.invited_by) || 'Someone'
                const title = notebookTitles.get(inv.notebook_id) || 'Notebook'
                const roleLabel = inv.role === 'viewer' ? 'Viewer invite' : 'Editor invite'
                notebookNotifications.push({
                    id: `invite_${inv.id}`,
                    date: inv.created_at,
                    context: {
                        excerpt: 'Notebook',
                        title: `${inviter} invited you to collaborate on "${title}"`,
                        count: roleLabel,
                        date: inv.created_at,
                        url: `/notebooks/invite/${encodeURIComponent(inv.token)}`,
                    },
                })
            }

            for (const col of filteredCollabs) {
                const inviter = col.invited_by ? inviterMap.get(col.invited_by) || 'Someone' : 'Someone'
                const title = notebookTitles.get(col.notebook_id) || 'Notebook'
                const roleLabel = col.role === 'viewer' ? 'Viewer' : 'Editor'
                notebookNotifications.push({
                    id: `collab_${col.id}`,
                    date: col.created_at,
                    context: {
                        excerpt: 'Notebook',
                        title: `${inviter} added you to "${title}"`,
                        count: roleLabel,
                        date: col.created_at,
                        url: `/notebooks/${col.notebook_id}`,
                    },
                })
            }
        }
    } catch (err) {
        console.warn('[wim-notifications] error processing notebook notifications', err)
    }

    const assistantNotifications = listAssistantNotifications()
    const all = [...assistantNotifications, ...forumNotifications, ...notebookNotifications]
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return all
}

export async function dismissUserNotification(id: number | string): Promise<{ ok: boolean; error?: string }> {
    const strId = String(id)
    if (isAssistantNoticeId(strId)) {
        dismissAssistantNotice(strId)
        return { ok: true }
    }
    if (strId.startsWith('invite_') || strId.startsWith('collab_') || strId.startsWith('notebook_')) {
        markDismissedNotebookNotificationId(strId)
        return { ok: true }
    }
    const numId = Number(id)
    if (Number.isFinite(numId)) {
        const { error } = await supabase
            .from('user_notifications')
            .update({ dismissed_at: new Date().toISOString() })
            .eq('id', numId)
        if (error) return { ok: false, error: error.message }
        return { ok: true }
    }
    markDismissedNotebookNotificationId(strId)
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
