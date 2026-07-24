const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KTgzPl0F8_-HzMC_ZEpqMA_ZR7XPnMX'

export interface SupabasePost {
    id: string
    title: string
    slug: string
    content: string
    excerpt?: string
    category?: string
    created_at: string
    image_url?: string
    author?: string
    author_avatar?: string
    tags?: string[]
}

export async function fetchSupabasePosts(): Promise<SupabasePost[]> {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=*&order=created_at.desc`, {
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
        console.error('Error fetching Supabase posts:', e)
        return []
    }
}

export async function fetchSupabasePostBySlug(slug: string): Promise<SupabasePost | null> {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?slug=eq.${encodeURIComponent(slug)}&select=*`, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            cache: 'no-store',
        })
        if (!res.ok) return null
        const data = await res.json()
        return Array.isArray(data) && data.length > 0 ? data[0] : null
    } catch (e) {
        console.error('Error fetching Supabase post by slug:', e)
        return null
    }
}

export function formatSupabasePostToStrapi(post: SupabasePost) {
    const avatarUrl = post.author_avatar || 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png'
    return {
        id: post.id,
        attributes: {
            title: post.title,
            slug: post.slug,
            body: post.content,
            excerpt: post.excerpt || post.title,
            date: post.created_at ? post.created_at.split('T')[0] : '2026-01-01',
            featuredImage: {
                url: post.image_url || 'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/components/Blog/images/default.jpg',
            },
            authors: {
                data: [
                    {
                        id: '1',
                        attributes: {
                            firstName: post.author ? post.author.split(' ')[0] : 'WorldInMaking',
                            lastName: post.author ? post.author.split(' ').slice(1).join(' ') : 'Team',
                            avatar: {
                                url: avatarUrl,
                                formats: {
                                    thumbnail: {
                                        url: avatarUrl,
                                    },
                                },
                            },
                        },
                    },
                ],
            },
            post_category: {
                data: {
                    attributes: {
                        label: post.category || 'Articles',
                        folder: 'blog',
                    },
                },
            },
            post_tags: {
                data: (Array.isArray(post.tags) ? post.tags : [post.category || 'Article']).map((tag) => ({
                    attributes: { label: String(tag) },
                })),
            },
        },
    }
}
