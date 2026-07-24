const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KTgzPl0F8_-HzMC_ZEpqMA_ZR7XPnMX'

export interface SupabaseCommunityPost {
    id: number | string
    title: string
    content: string
    created_at: string
    view_count?: number
    author_id?: string
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
    profiles?: {
        id: string
        username: string
        avatar_url: string
    }
}

export async function fetchSupabaseCommunityPosts(slug?: string): Promise<SupabaseCommunityPost[]> {
    try {
        let url = `${SUPABASE_URL}/rest/v1/community_posts?select=id,title,content,created_at,view_count,author_id,profiles(id,username,avatar_url)&order=created_at.desc`
        if (slug) {
            // For a specific blog post comment section: only fetch comments matching post_slug or title comment_<slug>_*
            url += `&or=(post_slug.eq.${slug},title.ilike.comment_${encodeURIComponent(slug)}_*)`
        } else {
            // For main Community Forum: EXCLUDE all blog post comments! (post_slug is null AND title does not start with comment_)
            url += `&post_slug=is.null&title=not.ilike.comment_*`
        }

        const res = await fetch(url, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            cache: 'no-store',
        })
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : []
    } catch (e) {
        console.error('Error fetching Supabase community posts:', e)
        return []
    }
}

export async function fetchSupabaseCommunityReplies(postId: number | string): Promise<SupabaseCommunityReply[]> {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/community_replies?post_id=eq.${postId}&select=id,post_id,content,created_at,author_id,profiles(id,username,avatar_url)&order=created_at.asc`,
            {
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                },
                cache: 'no-store',
            }
        )
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : []
    } catch (e) {
        console.error('Error fetching Supabase community replies:', e)
        return []
    }
}

export function formatSupabaseCommunityToStrapi(post: SupabaseCommunityPost) {
    const username = post.profiles?.username || 'Community Member'
    const avatarUrl =
        post.profiles?.avatar_url ||
        'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/pages-content/images/hog-9.png'

    const isComment = post.title?.startsWith('comment_')
    const displayTitle = isComment ? '' : (post.title || 'Community Discussion')

    return {
        id: post.id,
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
            profile: {
                data: {
                    id: post.profiles?.id || '1',
                    attributes: {
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
            replies: {
                data: [],
            },
        },
    }
}

export async function postSupabaseCommunityQuestion(title: string, content: string, slug?: string): Promise<boolean> {
    try {
        const payload: any = {
            title: slug ? `comment_${slug}_${title}` : title,
            content,
            created_at: new Date().toISOString(),
        }
        if (slug) {
            payload.post_slug = slug
        }
        const res = await fetch(`${SUPABASE_URL}/rest/v1/community_posts`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify(payload),
        })
        return res.ok
    } catch (e) {
        console.error('Error posting question to Supabase:', e)
        return false
    }
}

export async function postSupabaseCommunityReply(postId: number | string, content: string): Promise<boolean> {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/community_replies`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                post_id: postId,
                content,
                created_at: new Date().toISOString(),
            }),
        })
        return res.ok
    } catch (e) {
        console.error('Error posting reply to Supabase:', e)
        return false
    }
}

