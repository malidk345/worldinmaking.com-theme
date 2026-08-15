import { supabase } from './supabase'
import { fetchWithCache, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-rest'

export { supabase, fetchWithCache, SUPABASE_URL, SUPABASE_ANON_KEY }

export interface SupabaseCommunityPost {
    id: number | string
    title: string
    content: string
    created_at: string
    view_count?: number
    author_id?: string
    is_pinned?: boolean
    is_archived?: boolean
    resolved_reply_id?: number | string | null
    profiles?: {
        id: string
        username: string
        avatar_url: string
    }
}

export interface SupabaseCommunityReply {
    id: number | string
    post_id: number | string
    content: string
    created_at: string
    author_id?: string
    is_hidden?: boolean
    profiles?: {
        id: string
        username: string
        avatar_url: string
    }
}

export async function fetchSupabaseCommunityPosts(
    slug?: string,
    postId?: number | string,
    options?: { authorId?: string; limit?: number }
): Promise<SupabaseCommunityPost[]> {
    let url = `${SUPABASE_URL}/rest/v1/community_posts?select=id,title,content,created_at,view_count,author_id,is_pinned,is_archived,resolved_reply_id,profiles!community_posts_author_id_fkey(id,username,avatar_url)&order=created_at.desc`
    if (postId || (slug && !isNaN(Number(slug)))) {
        const idToUse = postId || slug
        url += `&id=eq.${idToUse}`
    } else if (slug) {
        const words = slug.replace(/[^a-zA-Z0-9\s-]/g, '').split(/[-_\s]+/).filter((w) => w.length > 2).slice(0, 3).join('%')
        url += `&or=(post_slug.eq.${encodeURIComponent(slug)},title.ilike.*${encodeURIComponent(words)}*,title.ilike.comment_${encodeURIComponent(slug)}_*)`
    } else {
        url += `&title=not.ilike.comment_*`
    }
    if (options?.authorId) {
        url += `&author_id=eq.${encodeURIComponent(options.authorId)}`
    }
    if (!postId && !(slug && !isNaN(Number(slug)))) {
        url += `&limit=${options?.limit ?? 1000}`
    }
    return fetchWithCache(url)
}

export async function fetchSupabaseCommunityReplies(postId: number | string): Promise<SupabaseCommunityReply[]> {
    const url = `${SUPABASE_URL}/rest/v1/community_replies?post_id=eq.${postId}&select=id,post_id,content,created_at,author_id,is_hidden,profiles!community_replies_author_id_fkey(id,username,avatar_url)&order=created_at.asc`
    return fetchWithCache(url)
}

export function formatSupabaseCommunityToStrapi(post: SupabaseCommunityPost) {
    const profileObj = Array.isArray(post.profiles) ? (post.profiles as any)[0] : post.profiles
    const username = profileObj?.username || 'Community Member'
    const avatarUrl =
        profileObj?.avatar_url ||
        'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/pages-content/images/hog-9.png'

    const isComment = post.title?.startsWith('comment_')
    const displayTitle = isComment ? '' : (post.title || 'Community Discussion')

    return {
        id: post.id,
        title: displayTitle,
        subject: displayTitle,
        body: post.content,
        content: post.content,
        created_at: post.created_at,
        attributes: {
            id: post.id,
            permalink: String(post.id),
            subject: displayTitle,
            title: displayTitle,
            createdAt: post.created_at,
            publishedAt: post.created_at,
            activeAt: post.created_at,
            viewCount: post.view_count || 0,
            numReplies: 0,
            pinned: !!post.is_pinned,
            archived: !!post.is_archived,
            resolved: post.resolved_reply_id != null,
            resolvedBy: post.resolved_reply_id != null ? { data: { id: post.resolved_reply_id } } : { data: null },
            profile: {
                data: {
                    id: profileObj?.id || post.author_id || '1',
                    attributes: {
                        username: profileObj?.username || '',
                        firstName: username,
                        lastName: '',
                        gravatarURL: avatarUrl,
                        avatar: {
                            data: {
                                attributes: {
                                    url: avatarUrl,
                                },
                            },
                        },
                    },
                },
            },
            body: post.content,
            content: post.content,
            replies: {
                data: [],
            },
        },
    }
}

/** Prefer live Supabase session JWT so RLS author_id checks pass. */
async function getAuthedRestHeaders(): Promise<{ headers: Record<string, string>; userId: string } | null> {
    try {
        const { data } = await supabase.auth.getSession()
        const session = data.session
        if (!session?.user?.id || !session.access_token) return null
        return {
            userId: session.user.id,
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
        }
    } catch {
        return null
    }
}

export async function postSupabaseCommunityQuestion(
    title: string,
    content: string,
    slug?: string,
    channelId: number = 1
): Promise<{ ok: boolean; id?: number | string; error?: string }> {
    try {
        const auth = await getAuthedRestHeaders()
        if (!auth) {
            console.warn('[community] post requires signed-in Supabase session')
            return { ok: false, error: 'Not signed in' }
        }
        const payload: Record<string, unknown> = {
            title: slug ? `comment_${slug}_${title}` : title,
            content,
            author_id: auth.userId,
            channel_id: channelId,
            created_at: new Date().toISOString(),
        }
        if (slug) {
            payload.post_slug = slug
        }
        const headers = { ...auth.headers, Prefer: 'return=representation' }
        const res = await fetch(`${SUPABASE_URL}/rest/v1/community_posts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        })
        if (!res.ok) {
            const text = await res.text()
            console.error('[community] post failed', res.status, text)
            return { ok: false, error: text.slice(0, 200) }
        }
        const rows = await res.json()
        const row = Array.isArray(rows) ? rows[0] : rows
        return { ok: true, id: row?.id }
    } catch (e) {
        console.error('Error posting question to Supabase:', e)
        return { ok: false, error: e instanceof Error ? e.message : 'failed' }
    }
}

export async function postSupabaseCommunityReply(
    postId: number | string,
    content: string
): Promise<{ ok: boolean; id?: number | string; error?: string }> {
    try {
        const auth = await getAuthedRestHeaders()
        if (!auth) {
            console.warn('[community] reply requires signed-in Supabase session')
            return { ok: false, error: 'Not signed in' }
        }
        const headers = { ...auth.headers, Prefer: 'return=representation' }
        const res = await fetch(`${SUPABASE_URL}/rest/v1/community_replies`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                post_id: postId,
                content,
                author_id: auth.userId,
                created_at: new Date().toISOString(),
            }),
        })
        if (!res.ok) {
            const text = await res.text()
            console.error('[community] reply failed', res.status, text)
            return { ok: false, error: text.slice(0, 200) }
        }
        const rows = await res.json()
        const row = Array.isArray(rows) ? rows[0] : rows
        return { ok: true, id: row?.id }
    } catch (e) {
        console.error('Error posting reply to Supabase:', e)
        return { ok: false, error: e instanceof Error ? e.message : 'failed' }
    }
}

export async function postSupabaseCommunityPost(data: { title: string; content: string; author?: string }) {
    return postSupabaseCommunityQuestion(data.title, data.content)
}

export async function fetchSupabasePostBySlug(slug: string) {
    try {
        const posts = await fetchSupabaseCommunityPosts(slug)
        if (posts && posts.length > 0) {
            const post = posts[0]
            const replies = await fetchSupabaseCommunityReplies(post.id)
            const strapiObj = formatSupabaseCommunityToStrapi(post)
            if (replies && replies.length > 0) {
                strapiObj.attributes.replies.data = replies.map((r: any) => {
                    const profileObj = Array.isArray(r.profiles) ? (r.profiles as any)[0] : r.profiles
                    const username = profileObj?.username || 'Philosopher / Community Member'
                    const avatarUrl =
                        profileObj?.avatar_url ||
                        'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/pages-content/images/hog-9.png'
                    return {
                        id: r.id,
                        attributes: {
                            id: r.id,
                            body: r.content,
                            createdAt: r.created_at,
                            publishedAt: r.created_at,
                            profile: {
                                data: {
                                    id: profileObj?.id || '1',
                                    attributes: {
                                        firstName: username,
                                        lastName: '',
                                        gravatarURL: avatarUrl,
                                        avatar: { data: { attributes: { url: avatarUrl } } },
                                    },
                                },
                            },
                        },
                    }
                }) as any
                strapiObj.attributes.numReplies = replies.length
            }
            return {
                postData: {
                    post: strapiObj,
                },
            }
        }
        return null
    } catch (e) {
        console.error('Error fetching Supabase post by slug:', e)
        return null
    }
}
