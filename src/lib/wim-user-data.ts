/**
 * User-owned social data on Supabase: bookmarks, post likes, reply votes.
 */
import { supabase } from 'lib/supabase'
import { getSessionAccessToken } from 'lib/wim-auth'

export type WimBookmark = {
    url: string
    title: string
    description: string
    notes: string
    savedAt?: string
}

async function requireUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
}

function slugFromUrl(url: string): string {
    try {
        const u = url.startsWith('http') ? new URL(url) : new URL(url, 'https://worldinmaking.com')
        return u.pathname.replace(/\/+$/, '') || '/'
    } catch {
        return url
    }
}

export async function fetchUserBookmarks(userId?: string): Promise<WimBookmark[]> {
    const uid = userId || (await requireUserId())
    if (!uid) return []
    const { data, error } = await supabase
        .from('user_saved_posts')
        .select('post_id, post_slug, post_title, saved_at')
        .eq('user_id', uid)
        .order('saved_at', { ascending: false })
    if (error) {
        console.warn('[wim-user-data] bookmarks', error.message)
        return []
    }
    return (data || []).map((row) => ({
        url: row.post_slug || row.post_id || '/',
        title: row.post_title || row.post_slug || 'Saved',
        description: '',
        notes: '',
        savedAt: row.saved_at || '',
    }))
}

export async function addUserBookmark(args: {
    url: string
    title: string
    description?: string
}): Promise<{ ok: boolean; error?: string }> {
    const uid = await requireUserId()
    if (!uid) return { ok: false, error: 'Not signed in' }
    const slug = slugFromUrl(args.url)
    const { error } = await supabase.from('user_saved_posts').upsert(
        {
            user_id: uid,
            post_id: slug,
            post_slug: slug,
            post_title: args.title || slug,
            saved_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,post_id' }
    )
    // onConflict may fail if no unique constraint — fall back to insert-or-ignore pattern
    if (error) {
        const { error: e2 } = await supabase.from('user_saved_posts').insert({
            user_id: uid,
            post_id: slug,
            post_slug: slug,
            post_title: args.title || slug,
            saved_at: new Date().toISOString(),
        })
        if (e2 && !/duplicate|unique/i.test(e2.message)) {
            return { ok: false, error: e2.message }
        }
    }
    return { ok: true }
}

export async function removeUserBookmark(args: { url: string }): Promise<{ ok: boolean; error?: string }> {
    const uid = await requireUserId()
    if (!uid) return { ok: false, error: 'Not signed in' }
    const slug = slugFromUrl(args.url)
    const { error } = await supabase.from('user_saved_posts').delete().eq('user_id', uid).eq('post_id', slug)
    if (error) {
        const { error: e2 } = await supabase.from('user_saved_posts').delete().eq('user_id', uid).eq('post_slug', slug)
        if (e2) return { ok: false, error: e2.message }
    }
    return { ok: true }
}

export async function fetchUserPostLikes(userId?: string): Promise<{ id: string | number }[]> {
    const uid = userId || (await requireUserId())
    if (!uid) return []
    const { data, error } = await supabase.from('post_likes').select('post_id').eq('user_id', uid)
    if (error) {
        console.warn('[wim-user-data] post_likes', error.message)
        return []
    }
    return (data || []).map((r) => ({ id: r.post_id }))
}

export async function setPostLike(
    postId: string | number,
    unlike: boolean,
    slug?: string
): Promise<{ ok: boolean; error?: string }> {
    const uid = await requireUserId()
    if (!uid) return { ok: false, error: 'Not signed in' }
    const id = String(postId)
    if (unlike) {
        const { error } = await supabase.from('post_likes').delete().eq('user_id', uid).eq('post_id', id)
        if (error) return { ok: false, error: error.message }
        return { ok: true }
    }
    const { error } = await supabase.from('post_likes').insert({
        user_id: uid,
        post_id: id,
        created_at: new Date().toISOString(),
    })
    if (error && !/duplicate|unique/i.test(error.message)) {
        // also try post_votes as fallback shape
        const { error: e2 } = await supabase.from('post_votes').upsert({
            user_id: uid,
            post_id: id,
            post_slug: slug || id,
            vote: 1,
            vote_type: 'up',
            vote_count: 1,
            updated_at: new Date().toISOString(),
        })
        if (e2) return { ok: false, error: e2.message }
    }
    return { ok: true }
}

export async function setReplyVote(
    replyId: number | string,
    vote: 'up' | 'down'
): Promise<{ ok: boolean; error?: string }> {
    const uid = await requireUserId()
    if (!uid) return { ok: false, error: 'Not signed in' }
    const value = vote === 'up' ? 1 : -1

    const { data: existing } = await supabase
        .from('community_reply_votes')
        .select('vote')
        .eq('user_id', uid)
        .eq('reply_id', Number(replyId))
        .maybeSingle()

    await supabase.from('community_reply_votes').delete().eq('user_id', uid).eq('reply_id', Number(replyId))

    if (existing && existing.vote === value) {
        return { ok: true }
    }

    const { error } = await supabase.from('community_reply_votes').insert({
        reply_id: Number(replyId),
        user_id: uid,
        vote: value,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
}

export async function setCommunityPostVote(
    postId: number | string,
    vote: 'up' | 'down' | 1 | -1 | 0
): Promise<{ ok: boolean; error?: string }> {
    const uid = await requireUserId()
    if (!uid) return { ok: false, error: 'Not signed in' }
    const value = vote === 'up' || vote === 1 ? 1 : vote === 'down' || vote === -1 ? -1 : 0

    const { data: existing } = await supabase
        .from('community_post_votes')
        .select('vote')
        .eq('user_id', uid)
        .eq('post_id', Number(postId))
        .maybeSingle()

    await supabase.from('community_post_votes').delete().eq('user_id', uid).eq('post_id', Number(postId))

    if (value === 0 || (existing && existing.vote === value)) {
        return { ok: true }
    }

    const { error } = await supabase.from('community_post_votes').insert({
        post_id: Number(postId),
        user_id: uid,
        vote: value,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
}

/** Ensure JWT is available (side effect for REST callers). */
export async function ensureAccessToken(): Promise<string | null> {
    return getSessionAccessToken()
}
