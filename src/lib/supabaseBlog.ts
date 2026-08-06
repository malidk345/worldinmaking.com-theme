import { fetchWithCache, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-rest'

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

const MOCK_SUPABASE_POSTS: SupabasePost[] = [
    {
        id: '1',
        title: 'Welcome to WorldInMaking Blog',
        slug: 'welcome-to-worldinmaking',
        content: '# Welcome to WorldInMaking\n\nThis is our official blog where we share updates, product engineering guides, and tutorials.',
        excerpt: 'Welcome to our official engineering & product blog.',
        category: 'News',
        created_at: '2026-07-26T12:00:00.000Z',
        image_url: 'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/components/Blog/images/default.jpg',
        author: 'Mustafa Dursunkaya',
        tags: ['News', 'Product'],
    },
    {
        id: '2',
        title: 'How to build web applications with Next.js & Cloudflare Pages',
        slug: 'nextjs-cloudflare-pages-guide',
        content: '# Building with Next.js and Cloudflare Pages\n\nLearn how to optimize static prerendering, edge functions, and hydration in Next.js.',
        excerpt: 'A comprehensive guide to deploying Next.js apps on Cloudflare Pages.',
        category: 'Tutorials',
        created_at: '2026-07-25T14:00:00.000Z',
        image_url: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png',
        author: 'PostHog Team',
        tags: ['Engineering', 'Next.js'],
    },
]

export async function fetchSupabasePosts(): Promise<SupabasePost[]> {
    try {
        const url = `${SUPABASE_URL}/rest/v1/posts?select=*&order=created_at.desc`
        const data = await fetchWithCache(url)
        return Array.isArray(data) && data.length > 0 ? data : MOCK_SUPABASE_POSTS
    } catch (e) {
        console.error('Error fetching Supabase posts:', e)
        return MOCK_SUPABASE_POSTS
    }
}

export async function searchSupabasePosts(query: string): Promise<SupabasePost[]> {
    const cleanQuery = query.trim()
    if (!cleanQuery) return []
    try {
        const encoded = encodeURIComponent(`*${cleanQuery}*`)
        const url = `${SUPABASE_URL}/rest/v1/posts?or=(title.ilike.${encoded},excerpt.ilike.${encoded},content.ilike.${encoded})&select=*&limit=20`
        const data = await fetchWithCache(url)
        if (Array.isArray(data) && data.length > 0) return data

        const lower = cleanQuery.toLowerCase()
        return MOCK_SUPABASE_POSTS.filter((p) =>
            [p.title, p.excerpt, p.content].some((field) => field?.toLowerCase().includes(lower))
        )
    } catch (e) {
        console.error('Error searching Supabase posts:', e)
        const lower = cleanQuery.toLowerCase()
        return MOCK_SUPABASE_POSTS.filter((p) =>
            [p.title, p.excerpt, p.content].some((field) => field?.toLowerCase().includes(lower))
        )
    }
}

export async function fetchSupabasePostBySlug(slug: string): Promise<SupabasePost | null> {
    try {
        const cleanSlugStr = slug.replace(/^\/posts\/?/, '').replace(/^\/blog\/?/, '')
        const url = `${SUPABASE_URL}/rest/v1/posts?slug=eq.${encodeURIComponent(cleanSlugStr)}&select=*`
        const data = await fetchWithCache(url)
        if (Array.isArray(data) && data.length > 0) return data[0]
        const found = MOCK_SUPABASE_POSTS.find((p) => p.slug === cleanSlugStr)
        return found || MOCK_SUPABASE_POSTS[0]
    } catch (e) {
        console.error('Error fetching Supabase post by slug:', e)
        const cleanSlugStr = slug.replace(/^\/posts\/?/, '').replace(/^\/blog\/?/, '')
        const found = MOCK_SUPABASE_POSTS.find((p) => p.slug === cleanSlugStr)
        return found || MOCK_SUPABASE_POSTS[0]
    }
}

export function formatSupabasePostToStrapi(post: SupabasePost) {
    const avatarUrl = post.author_avatar || 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png'
    const imageUrl = post.image_url && post.image_url.trim() !== '' ? post.image_url : 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png'
    const rawSlug = post.slug || 'default'
    const cleanSlug = rawSlug.startsWith('/') ? rawSlug : `/posts/${rawSlug}`

    return {
        id: post.id,
        attributes: {
            title: post.title || 'Untitled Post',
            slug: cleanSlug,
            body: post.content || '',
            excerpt: post.excerpt || post.title || '',
            date: post.created_at ? post.created_at.split('T')[0] : '2026-01-01',
            featuredImage: {
                url: imageUrl,
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
                        folder: 'posts',
                    },
                },
            },
            post_tags: {
                data: (Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [post.category || 'Article']).map((tag) => ({
                    attributes: { label: String(tag) },
                })),
            },
        },
    }
}
