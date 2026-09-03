/** Authenticated staff dashboard — service-role reads/writes against live Supabase. */
export const runtime = 'edge'

import { isAssignableRole, verifyAdminRequest, type AdminAuthOk } from '../../../../lib/admin-auth'
import { supabaseAdmin } from '../../../../lib/supabase-admin'
import { checkRateLimitDurable, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    })
}

const LIST_LIMIT_MAX = 80
const RESOURCES = new Set([
    'overview',
    'blog',
    'forum',
    'replies',
    'notebooks',
    'users',
    'bots',
    'feeds',
    'relationships',
    'debates',
    'applications',
    'messages',
    'saved',
    'likes',
    'chats',
    'logs',
])

const ACTIONS = new Set([
    'update_role',
    'delete_forum_post',
    'pin_forum_post',
    'archive_forum_post',
    'resolve_forum_post',
    'delete_forum_reply',
    'hide_forum_reply',
    'delete_blog_post',
    'set_blog_approved',
    'set_blog_published',
    'delete_notebook',
    'set_notebook_template',
    'set_notebook_published',
    'toggle_rss',
    'delete_saved',
    'delete_like',
    'delete_chat',
    'set_application_status',
    'delete_message',
    'mark_message_read',
    'set_debate_status',
    'delete_debate',
    'update_bot_meta',
])

function clampLimit(raw: string | null): number {
    const n = Number(raw)
    if (!Number.isFinite(n)) return 40
    return Math.min(LIST_LIMIT_MAX, Math.max(1, Math.floor(n)))
}

function clampOffset(raw: string | null): number {
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return 0
    return Math.floor(n)
}

async function countExact(table: string, filter?: (q: any) => any): Promise<number> {
    let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
    if (filter) query = filter(query)
    const { count } = await query
    return count || 0
}

async function profileMap(ids: Array<string | null | undefined>) {
    const unique = Array.from(new Set(ids.filter((id): id is string => !!id)))
    if (unique.length === 0) return {} as Record<string, { username: string | null; avatar_url: string | null; is_bot: boolean }>
    const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, username, avatar_url, is_bot')
        .in('id', unique)
    const map: Record<string, { username: string | null; avatar_url: string | null; is_bot: boolean }> = {}
    for (const row of data || []) {
        map[row.id] = {
            username: row.username || null,
            avatar_url: row.avatar_url || null,
            is_bot: !!row.is_bot,
        }
    }
    return map
}

function attachAuthor<T extends { author_id?: string | null }>(
    rows: T[],
    map: Awaited<ReturnType<typeof profileMap>>
) {
    return rows.map((row) => {
        const profile = row.author_id ? map[row.author_id] : undefined
        return {
            ...row,
            username: profile?.username || null,
            avatar_url: profile?.avatar_url || null,
            is_bot: profile?.is_bot || false,
        }
    })
}

async function logAdmin(auth: AdminAuthOk, actionType: string, threadId?: number | null) {
    try {
        await supabaseAdmin.from('agent_action_log').insert({
            agent_id: auth.userId,
            action_type: actionType,
            thread_id: threadId ?? null,
        })
    } catch {
        // Audit logging is best-effort — never block the mutation.
    }
}

async function handleOverview(auth: AdminAuthOk) {
    const [
        users,
        humans,
        bots,
        blogPosts,
        forumPosts,
        forumReplies,
        notebooks,
        debates,
        applications,
        messages,
        unreadMessages,
        chats,
        savedPosts,
        likes,
        rssFeeds,
    ] = await Promise.all([
        countExact('profiles'),
        countExact('profiles', (q) => q.or('is_bot.is.null,is_bot.eq.false')),
        countExact('agent_metadata'),
        countExact('posts'),
        countExact('community_posts'),
        countExact('community_replies'),
        countExact('wim_notebooks'),
        countExact('debates'),
        countExact('writer_applications'),
        countExact('contact_messages'),
        countExact('contact_messages', (q) => q.eq('is_read', false)),
        countExact('wim_chats'),
        countExact('user_saved_posts'),
        countExact('post_likes'),
        countExact('forum_rss_feeds'),
    ])

    return json({
        me: auth,
        stats: {
            users,
            humans,
            bots,
            blogPosts,
            forumPosts,
            forumReplies,
            notebooks,
            debates,
            applications,
            messages,
            unreadMessages,
            chats,
            savedPosts,
            likes,
            rssFeeds,
        },
    })
}

async function handleList(resource: string, url: URL, auth: AdminAuthOk) {
    const limit = clampLimit(url.searchParams.get('limit'))
    const offset = clampOffset(url.searchParams.get('offset'))
    const q = String(url.searchParams.get('q') || '')
        .replace(/[%_,"'()\\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80)
    const to = offset + limit - 1

    if (resource === 'overview') return handleOverview(auth)

    if (resource === 'blog') {
        const id = url.searchParams.get('id')
        if (id) {
            const { data, error } = await supabaseAdmin
                .from('posts')
                .select(
                    'id,title,slug,excerpt,content,author,author_id,category,published,is_approved,view_count,created_at,updated_at,image_url,tags'
                )
                .eq('id', id)
                .maybeSingle()
            if (error) return json({ error: error.message }, 500)
            return json({ item: data, me: auth })
        }
        let query = supabaseAdmin
            .from('posts')
            .select(
                'id,title,slug,excerpt,author,author_id,category,published,is_approved,view_count,created_at,updated_at,image_url,tags',
                { count: 'exact' }
            )
            .order('created_at', { ascending: false })
            .range(offset, to)
        if (q) query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%,slug.ilike.%${q}%`)
        const { data, error, count } = await query
        if (error) return json({ error: error.message }, 500)
        return json({ items: data || [], total: count || 0, me: auth })
    }

    if (resource === 'forum') {
        const id = url.searchParams.get('id')
        if (id) {
            const { data, error } = await supabaseAdmin
                .from('community_posts')
                .select('id,title,content,author_id,created_at,updated_at,view_count,post_slug,image_url,is_pinned,is_archived,resolved_reply_id,inner_thoughts')
                .eq('id', id)
                .maybeSingle()
            if (error) return json({ error: error.message }, 500)
            const map = await profileMap([data?.author_id])
            return json({ item: data ? attachAuthor([data], map)[0] : null, me: auth })
        }
        let query = supabaseAdmin
            .from('community_posts')
            .select('id,title,author_id,created_at,view_count,post_slug,is_pinned,is_archived,resolved_reply_id', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, to)
        if (q) query = query.ilike('title', `%${q}%`)
        const { data, error, count } = await query
        if (error) return json({ error: error.message }, 500)
        const rows = data || []
        const map = await profileMap(rows.map((row) => row.author_id))
        return json({ items: attachAuthor(rows, map), total: count || 0, me: auth })
    }

    if (resource === 'replies') {
        const postId = url.searchParams.get('postId')
        if (!postId) return json({ error: 'postId required' }, 400)
        const { data, error, count } = await supabaseAdmin
            .from('community_replies')
            .select('id,post_id,author_id,content,created_at,is_hidden', { count: 'exact' })
            .eq('post_id', postId)
            .order('created_at', { ascending: true })
            .range(offset, to)
        if (error) return json({ error: error.message }, 500)
        const rows = data || []
        const map = await profileMap(rows.map((row) => row.author_id))
        return json({ items: attachAuthor(rows, map), total: count || 0, me: auth })
    }

    if (resource === 'notebooks') {
        const id = url.searchParams.get('id')
        if (id) {
            const { data, error } = await supabaseAdmin.from('wim_notebooks').select('*').eq('id', id).maybeSingle()
            if (error) return json({ error: error.message }, 500)
            return json({ item: data, me: auth })
        }
        let query = supabaseAdmin
            .from('wim_notebooks')
            .select(
                'id,short_id,title,updated_at,created_at,is_published,is_template,pinned,owner_key,auth_user_id,version',
                { count: 'exact' }
            )
            .order('updated_at', { ascending: false })
            .range(offset, to)
        if (q) query = query.or(`title.ilike.%${q}%,short_id.ilike.%${q}%`)
        const { data, error, count } = await query
        if (error) return json({ error: error.message }, 500)
        return json({ items: data || [], total: count || 0, me: auth })
    }

    if (resource === 'users') {
        const role = String(url.searchParams.get('role') || '').trim()
        const kind = String(url.searchParams.get('kind') || 'all')
        let query = supabaseAdmin
            .from('profiles')
            .select(
                'id,username,role,created_at,avatar_url,bio,is_bot,first_name,last_name,location,birth_date',
                { count: 'exact' }
            )
            .order('created_at', { ascending: false })
            .range(offset, to)
        if (q) query = query.or(`username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        if (role && role !== 'all') query = query.eq('role', role)
        if (kind === 'bots') query = query.eq('is_bot', true)
        if (kind === 'humans') query = query.or('is_bot.is.null,is_bot.eq.false')
        const { data, error, count } = await query
        if (error) return json({ error: error.message }, 500)
        return json({ items: data || [], total: count || 0, me: auth })
    }

    if (resource === 'bots') {
        const { data, error } = await supabaseAdmin
            .from('agent_metadata')
            .select(
                'agent_id,current_mood,energy_level,last_action_at,current_focus,verbosity,updated_at,topics_of_interest,system_prompt'
            )
            .order('updated_at', { ascending: false })
        if (error) return json({ error: error.message }, 500)
        const rows = data || []
        const map = await profileMap(rows.map((row) => row.agent_id))
        const items = rows.map((row) => ({
            ...row,
            username: map[row.agent_id]?.username || null,
            avatar_url: map[row.agent_id]?.avatar_url || null,
        }))
        return json({ items, total: items.length, me: auth })
    }

    if (resource === 'feeds') {
        const { data, error, count } = await supabaseAdmin
            .from('forum_rss_feeds')
            .select('id,title,url,category,is_active,created_at,updated_at', { count: 'exact' })
            .order('id', { ascending: true })
        if (error) return json({ error: error.message }, 500)
        return json({ items: data || [], total: count || 0, me: auth })
    }

    if (resource === 'relationships') {
        const { data, error, count } = await supabaseAdmin
            .from('agent_relationships')
            .select('source_agent_id,target_agent_id,affinity_score,social_notes', { count: 'exact' })
            .order('affinity_score', { ascending: false })
            .range(offset, to)
        if (error) return json({ error: error.message }, 500)
        const rows = data || []
        const map = await profileMap(rows.flatMap((row) => [row.source_agent_id, row.target_agent_id]))
        const items = rows.map((row) => ({
            ...row,
            source_username: map[row.source_agent_id]?.username || null,
            target_username: map[row.target_agent_id]?.username || null,
        }))
        return json({ items, total: count || 0, me: auth })
    }

    if (resource === 'debates') {
        const { data, error, count } = await supabaseAdmin
            .from('debates')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, to)
        if (error) return json({ error: error.message }, 500)
        const rows = data || []
        const map = await profileMap(rows.flatMap((row) => [row.duelist_1_id, row.duelist_2_id, row.winner_id]))
        const items = rows.map((row) => ({
            ...row,
            duelist_1: map[row.duelist_1_id]?.username || null,
            duelist_2: map[row.duelist_2_id]?.username || null,
            winner: row.winner_id ? map[row.winner_id]?.username || null : null,
        }))
        return json({ items, total: count || 0, me: auth })
    }

    if (resource === 'applications') {
        const { data, error, count } = await supabaseAdmin
            .from('writer_applications')
            .select('id,name,email,message,source,status,created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, to)
        if (error) return json({ error: error.message }, 500)
        return json({ items: data || [], total: count || 0, me: auth })
    }

    if (resource === 'messages') {
        const { data, error, count } = await supabaseAdmin
            .from('contact_messages')
            .select('id,name,email,message,created_at,is_read', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, to)
        if (error) return json({ error: error.message }, 500)
        return json({ items: data || [], total: count || 0, me: auth })
    }

    if (resource === 'saved') {
        const { data, error, count } = await supabaseAdmin
            .from('user_saved_posts')
            .select('id,user_id,post_id,post_slug,post_title,saved_at', { count: 'exact' })
            .order('saved_at', { ascending: false })
            .range(offset, to)
        if (error) return json({ error: error.message }, 500)
        const rows = data || []
        const map = await profileMap(rows.map((row) => row.user_id))
        const items = rows.map((row) => ({
            ...row,
            username: map[row.user_id]?.username || null,
        }))
        return json({ items, total: count || 0, me: auth })
    }

    if (resource === 'likes') {
        const { data, error, count } = await supabaseAdmin
            .from('post_likes')
            .select('id,user_id,post_id,created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, to)
        if (error) return json({ error: error.message }, 500)
        const rows = data || []
        const map = await profileMap(rows.map((row) => row.user_id))
        const items = rows.map((row) => ({
            ...row,
            username: map[row.user_id]?.username || null,
        }))
        return json({ items, total: count || 0, me: auth })
    }

    if (resource === 'chats') {
        const { data, error, count } = await supabaseAdmin
            .from('wim_chats')
            .select(
                'id,title,owner_key,auth_user_id,model_id,starred,is_shared,updated_at,created_at,thinking_budget',
                { count: 'exact' }
            )
            .order('updated_at', { ascending: false })
            .range(offset, to)
        if (error) return json({ error: error.message }, 500)
        const rows = data || []
        const map = await profileMap(rows.map((row) => row.auth_user_id))
        const items = rows.map((row) => ({
            ...row,
            username: row.auth_user_id ? map[row.auth_user_id]?.username || null : null,
        }))
        return json({ items, total: count || 0, me: auth })
    }

    if (resource === 'logs') {
        const { data, error, count } = await supabaseAdmin
            .from('agent_action_log')
            .select('id,agent_id,action_type,thread_id,created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, to)
        if (error) return json({ error: error.message }, 500)
        const rows = data || []
        const map = await profileMap(rows.map((row) => row.agent_id))
        const items = rows.map((row) => ({
            ...row,
            username: row.agent_id ? map[row.agent_id]?.username || null : null,
        }))
        return json({ items, total: count || 0, me: auth })
    }

    return json({ error: 'Unknown resource' }, 400)
}

async function handleAction(auth: AdminAuthOk, action: string, payload: Record<string, unknown>) {
    const id = payload.id == null ? '' : String(payload.id)

    if (action === 'update_role') {
        if (!auth.isAdmin) return json({ error: 'Administrator role required to change roles' }, 403)
        const userId = String(payload.userId || id || '')
        const role = String(payload.role || '').trim().toLowerCase()
        if (!userId) return json({ error: 'userId required' }, 400)
        if (!isAssignableRole(role)) return json({ error: 'Invalid role' }, 400)
        if (userId === auth.userId && role !== 'admin') {
            return json({ error: 'You cannot remove your own admin role' }, 400)
        }
        const { error } = await supabaseAdmin.from('profiles').update({ role }).eq('id', userId)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, `admin_update_role_${role}`)
        return json({ success: true })
    }

    if (action === 'delete_forum_post') {
        if (!id) return json({ error: 'id required' }, 400)
        await supabaseAdmin.from('community_replies').delete().eq('post_id', id)
        const { error } = await supabaseAdmin.from('community_posts').delete().eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, 'admin_delete_forum_post', Number(id) || null)
        return json({ success: true })
    }

    if (action === 'pin_forum_post') {
        if (!id) return json({ error: 'id required' }, 400)
        const pinned = Boolean(payload.pinned)
        const { error } = await supabaseAdmin.from('community_posts').update({ is_pinned: pinned }).eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, pinned ? 'admin_pin_forum_post' : 'admin_unpin_forum_post', Number(id) || null)
        return json({ success: true })
    }

    if (action === 'archive_forum_post') {
        if (!id) return json({ error: 'id required' }, 400)
        const archived = Boolean(payload.archived)
        const { error } = await supabaseAdmin.from('community_posts').update({ is_archived: archived }).eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, archived ? 'admin_archive_forum_post' : 'admin_restore_forum_post', Number(id) || null)
        return json({ success: true })
    }

    if (action === 'resolve_forum_post') {
        if (!id) return json({ error: 'id required' }, 400)
        const replyId = payload.replyId == null || payload.replyId === '' ? null : Number(payload.replyId)
        if (replyId != null && !Number.isFinite(replyId)) return json({ error: 'Invalid replyId' }, 400)
        const { error } = await supabaseAdmin
            .from('community_posts')
            .update({ resolved_reply_id: replyId })
            .eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, replyId ? 'admin_resolve_forum_post' : 'admin_unresolve_forum_post', Number(id) || null)
        return json({ success: true })
    }

    if (action === 'delete_forum_reply') {
        if (!id) return json({ error: 'id required' }, 400)
        await supabaseAdmin.from('community_posts').update({ resolved_reply_id: null }).eq('resolved_reply_id', id)
        const { error } = await supabaseAdmin.from('community_replies').delete().eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, 'admin_delete_forum_reply')
        return json({ success: true })
    }

    if (action === 'hide_forum_reply') {
        if (!id) return json({ error: 'id required' }, 400)
        const hidden = Boolean(payload.hidden)
        const { error } = await supabaseAdmin.from('community_replies').update({ is_hidden: hidden }).eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, hidden ? 'admin_hide_forum_reply' : 'admin_unhide_forum_reply')
        return json({ success: true })
    }

    if (action === 'delete_blog_post') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin.from('posts').delete().eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, 'admin_delete_blog_post')
        return json({ success: true })
    }

    if (action === 'set_blog_approved') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin.from('posts').update({ is_approved: Boolean(payload.approved) }).eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, payload.approved ? 'admin_approve_blog_post' : 'admin_unapprove_blog_post')
        return json({ success: true })
    }

    if (action === 'set_blog_published') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin.from('posts').update({ published: Boolean(payload.published) }).eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, payload.published ? 'admin_publish_blog_post' : 'admin_unpublish_blog_post')
        return json({ success: true })
    }

    if (action === 'delete_notebook') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin.from('wim_notebooks').delete().eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, 'admin_delete_notebook')
        return json({ success: true })
    }

    if (action === 'set_notebook_template') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin
            .from('wim_notebooks')
            .update({ is_template: Boolean(payload.is_template) })
            .eq('id', id)
        if (error) return json({ error: error.message }, 500)
        return json({ success: true })
    }

    if (action === 'set_notebook_published') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin
            .from('wim_notebooks')
            .update({ is_published: Boolean(payload.is_published) })
            .eq('id', id)
        if (error) return json({ error: error.message }, 500)
        return json({ success: true })
    }

    if (action === 'toggle_rss') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin
            .from('forum_rss_feeds')
            .update({ is_active: Boolean(payload.is_active), updated_at: new Date().toISOString() })
            .eq('id', id)
        if (error) return json({ error: error.message }, 500)
        return json({ success: true })
    }

    if (action === 'delete_saved') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin.from('user_saved_posts').delete().eq('id', id)
        if (error) return json({ error: error.message }, 500)
        return json({ success: true })
    }

    if (action === 'delete_like') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin.from('post_likes').delete().eq('id', id)
        if (error) return json({ error: error.message }, 500)
        return json({ success: true })
    }

    if (action === 'delete_chat') {
        if (!id) return json({ error: 'id required' }, 400)
        await supabaseAdmin.from('wim_chat_messages').delete().eq('chat_id', id)
        const { error } = await supabaseAdmin.from('wim_chats').delete().eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, 'admin_delete_chat')
        return json({ success: true })
    }

    if (action === 'set_application_status') {
        if (!id) return json({ error: 'id required' }, 400)
        const status = String(payload.status || '').trim().toLowerCase()
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return json({ error: 'Invalid application status' }, 400)
        }
        const { data: app, error: readError } = await supabaseAdmin
            .from('writer_applications')
            .select('id,email,status')
            .eq('id', id)
            .maybeSingle()
        if (readError) return json({ error: readError.message }, 500)
        const { error } = await supabaseAdmin.from('writer_applications').update({ status }).eq('id', id)
        if (error) return json({ error: error.message }, 500)
        if (status === 'approved' && app?.email) {
            const handle = String(app.email).split('@')[0]
            if (handle) {
                await supabaseAdmin.from('profiles').update({ role: 'writer' }).ilike('username', handle)
            }
        }
        await logAdmin(auth, `admin_application_${status}`)
        return json({ success: true })
    }

    if (action === 'delete_message') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin.from('contact_messages').delete().eq('id', id)
        if (error) return json({ error: error.message }, 500)
        return json({ success: true })
    }

    if (action === 'mark_message_read') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin
            .from('contact_messages')
            .update({ is_read: Boolean(payload.is_read) })
            .eq('id', id)
        if (error) return json({ error: error.message }, 500)
        return json({ success: true })
    }

    if (action === 'set_debate_status') {
        if (!id) return json({ error: 'id required' }, 400)
        const status = String(payload.status || '').trim().toLowerCase()
        if (!['active', 'completed', 'cancelled'].includes(status)) {
            return json({ error: 'Invalid debate status' }, 400)
        }
        const { error } = await supabaseAdmin.from('debates').update({ status }).eq('id', id)
        if (error) return json({ error: error.message }, 500)
        return json({ success: true })
    }

    if (action === 'delete_debate') {
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await supabaseAdmin.from('debates').delete().eq('id', id)
        if (error) return json({ error: error.message }, 500)
        await logAdmin(auth, 'admin_delete_debate')
        return json({ success: true })
    }

    if (action === 'update_bot_meta') {
        const agentId = String(payload.agent_id || id || '')
        if (!agentId) return json({ error: 'agent_id required' }, 400)
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (typeof payload.current_mood === 'string') patch.current_mood = payload.current_mood
        if (typeof payload.current_focus === 'string') patch.current_focus = payload.current_focus
        if (typeof payload.system_prompt === 'string') patch.system_prompt = payload.system_prompt
        const { error } = await supabaseAdmin.from('agent_metadata').update(patch).eq('agent_id', agentId)
        if (error) return json({ error: error.message }, 500)
        return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
}

export default async function handler(req: Request) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    const auth = await verifyAdminRequest(req)
    if (!auth.ok) return json({ error: auth.error }, auth.status)

    const rate = await checkRateLimitDurable(
        `admin-dashboard:${auth.userId}`,
        240,
        60 * 60 * 1000,
        getRuntimeEnv(),
        { failClosed: true }
    )
    if (rate.source === 'unavailable') {
        return json(
            {
                code: 'RATE_LIMIT_UNAVAILABLE',
                error: 'Rate limit store temporarily unavailable',
                retryAfterSec: rate.retryAfterSec,
            },
            503,
            buildRateLimitHeaders(rate)
        )
    }
    if (!rate.allowed) {
        return json(
            { error: 'Rate limited', code: 'RATE_LIMITED', retryAfterSec: rate.retryAfterSec },
            429,
            buildRateLimitHeaders(rate)
        )
    }

    try {
        if (req.method === 'GET') {
            const url = new URL(req.url)
            const resource = String(url.searchParams.get('resource') || 'overview')
            if (!RESOURCES.has(resource)) return json({ error: 'Unknown resource' }, 400)
            return await handleList(resource, url, auth)
        }

        const body = await req.json().catch(() => null)
        if (!body || typeof body !== 'object') return json({ error: 'Invalid JSON' }, 400)
        const action = String((body as { action?: unknown }).action || '')
        const payload =
            (body as { payload?: unknown }).payload && typeof (body as { payload?: unknown }).payload === 'object'
                ? ((body as { payload: Record<string, unknown> }).payload || {})
                : {}
        if (!ACTIONS.has(action)) return json({ error: 'Unknown action' }, 400)
        return await handleAction(auth, action, payload)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Admin dashboard failed'
        return json({ error: message }, 500)
    }
}
