/**
 * WIM blog — Supabase `public.posts` only.
 * No Squeak/Strapi, no mock fallbacks in production paths.
 */
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

/** Normalize any path-ish slug to bare id: "foo-bar" */
export function normalizePostSlug(slug: string): string {
    return String(slug || '')
        .trim()
        .replace(/^\/+/, '')
        .replace(/^(posts|blog)\//, '')
        .replace(/\/+$/, '')
}

/**
 * Map free-text category → PostListing folder keys
 * (blog | changelog | newsletter | spotlight | posts)
 */
export function categoryToFolder(category?: string | null): string {
    const c = String(category || '').toLowerCase()
    if (c.includes('changelog') || c.includes('release')) return 'changelog'
    if (c.includes('newsletter')) return 'newsletter'
    if (c.includes('spotlight')) return 'spotlight'
    if (c.includes('post') && !c.includes('blog')) return 'posts'
    // WIM default: everything is blog-facing
    return 'blog'
}

function restPostsUrl(query: string): string {
    return `${SUPABASE_URL}/rest/v1/posts?${query}`
}

export async function fetchSupabasePosts(options?: {
    limit?: number
    offset?: number
    category?: string
}): Promise<SupabasePost[]> {
    try {
        const limit = options?.limit ?? 1000
        const offset = options?.offset ?? 0
        const parts = [`select=*`, `order=created_at.desc`, `limit=${limit}`, `offset=${offset}`]
        if (options?.category) {
            parts.push(`category=ilike.*${encodeURIComponent(options.category)}*`)
        }
        const data = await fetchWithCache(restPostsUrl(parts.join('&')))
        return Array.isArray(data) ? data : []
    } catch (e) {
        console.error('[supabaseBlog] fetchSupabasePosts', e)
        return []
    }
}

/**
 * Ranked full-text search via `public.search_posts` RPC (migration 20260807_posts_fts).
 * Falls back to ILIKE if the RPC is missing or errors (pre-migration projects).
 */
export async function searchSupabasePosts(query: string): Promise<SupabasePost[]> {
    const cleanQuery = query.trim()
    if (!cleanQuery || cleanQuery.length < 2) return []

    // Prefer Postgres FTS (tsvector + websearch_to_tsquery + ts_rank_cd)
    try {
        const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_posts`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
            },
            body: JSON.stringify({ q: cleanQuery, lim: 40 }),
        })
        if (rpcRes.ok) {
            const data = await rpcRes.json()
            if (Array.isArray(data)) {
                return data as SupabasePost[]
            }
        } else if (rpcRes.status !== 404 && rpcRes.status !== 400) {
            // 404/400 often mean migration not applied yet — fall through to ILIKE
            const errText = await rpcRes.text().catch(() => '')
            console.warn('[supabaseBlog] search_posts RPC', rpcRes.status, errText.slice(0, 200))
        }
    } catch (e) {
        console.warn('[supabaseBlog] search_posts RPC failed, using ILIKE fallback', e)
    }

    // Fallback: REST ILIKE (pre-FTS or empty vector)
    try {
        const encoded = encodeURIComponent(`*${cleanQuery}*`)
        const url = restPostsUrl(
            `or=(title.ilike.${encoded},excerpt.ilike.${encoded},content.ilike.${encoded})&select=*&order=created_at.desc&limit=40`
        )
        const data = await fetchWithCache(url)
        return Array.isArray(data) ? data : []
    } catch (e) {
        console.error('[supabaseBlog] searchSupabasePosts', e)
        return []
    }
}

export async function fetchSupabasePostBySlug(slug: string): Promise<SupabasePost | null> {
    const clean = normalizePostSlug(slug)
    if (!clean) return null
    try {
        // Exact slug match first
        let data = await fetchWithCache(
            restPostsUrl(`slug=eq.${encodeURIComponent(clean)}&select=*&limit=1`)
        )
        if (Array.isArray(data) && data.length > 0) return data[0]

        // Some rows may store full path as slug
        for (const candidate of [`/posts/${clean}`, `/blog/${clean}`, clean]) {
            data = await fetchWithCache(
                restPostsUrl(`slug=eq.${encodeURIComponent(candidate)}&select=*&limit=1`)
            )
            if (Array.isArray(data) && data.length > 0) return data[0]
        }

        // ilike fallback (partial)
        data = await fetchWithCache(
            restPostsUrl(`slug=ilike.*${encodeURIComponent(clean)}*&select=*&limit=1`)
        )
        if (Array.isArray(data) && data.length > 0) return data[0]

        return null
    } catch (e) {
        console.error('[supabaseBlog] fetchSupabasePostBySlug', e)
        return null
    }
}

/** Strapi-shaped row for PostListing / ClientPost / Edition UI */
export function formatSupabasePostToStrapi(post: SupabasePost) {
    const avatarUrl =
        post.author_avatar ||
        'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png'
    const imageUrl =
        post.image_url && post.image_url.trim() !== ''
            ? post.image_url
            : 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png'
    const bare = normalizePostSlug(post.slug || post.id)
    const cleanSlug = `/posts/${bare}`
    const folder = categoryToFolder(post.category)

    return {
        id: post.id,
        attributes: {
            title: post.title || 'Untitled Post',
            slug: cleanSlug,
            body: post.content || '',
            excerpt: post.excerpt || post.title || '',
            date: post.created_at ? post.created_at.split('T')[0] : new Date().toISOString().slice(0, 10),
            publishedAt: post.created_at || null,
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
                        label: post.category || 'Blog',
                        folder,
                    },
                },
            },
            post_tags: {
                data: (
                    Array.isArray(post.tags) && post.tags.length > 0
                        ? post.tags
                        : [post.category || 'Article']
                ).map((tag) => ({
                    attributes: { label: String(tag) },
                })),
            },
        },
    }
}

/** Props for ClientPost from a Supabase row */
export function supabasePostToClientPostProps(post: SupabasePost) {
    const formatted = formatSupabasePostToStrapi(post)
    const a = formatted.attributes
    return {
        id: post.id as any,
        title: a.title,
        featuredImage: a.featuredImage,
        date: a.date,
        body: a.body,
        publishedAt: a.publishedAt || a.date,
        post_category: a.post_category as any,
        excerpt: a.excerpt,
        authors: a.authors,
        slug: a.slug,
        post_tags: a.post_tags as any,
    }
}
