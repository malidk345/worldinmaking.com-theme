/**
 * Local search API (Supabase posts). Cloudflare Pages requires Edge Runtime.
 */
export const runtime = 'edge'

import { fetchSupabasePosts } from '../../lib/supabaseBlog'

type SearchHit = {
    objectID: string
    title: string
    excerpt: string
    type: string
    slug: string
    fields: { slug: string }
}

let postsPromise: ReturnType<typeof fetchSupabasePosts> | null = null

const getPosts = () => {
    postsPromise ??= fetchSupabasePosts()
    return postsPromise
}

const getFacetValues = (value: string | string[] | null): string[] => {
    if (!value) return []
    return (Array.isArray(value) ? value : [value]).flatMap((item) => item.split(','))
}

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return json({ error: 'Method not allowed' }, 405)
    }

    const url = new URL(req.url)
    const query = String(url.searchParams.get('q') || '')
        .trim()
        .toLowerCase()
    const facetFilters = getFacetValues(url.searchParams.get('facetFilters'))
    const requestedType = facetFilters.find((filter) => filter.startsWith('type:'))?.replace('type:', '')

    const cacheHeaders = { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' }

    if (query.length < 2) {
        return json({ hits: [], nbHits: 0, facets: { type: {} } }, 200, cacheHeaders)
    }

    try {
        const posts = await getPosts()
        const hits: SearchHit[] = posts
            .filter((post) => !requestedType || requestedType === 'post')
            .map((post) => {
                const slug = post.slug.startsWith('/') ? post.slug : `/posts/${post.slug}`
                const searchableText = [post.title, post.excerpt, post.content, post.category, ...(post.tags || [])]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                return { post, slug, searchableText }
            })
            .filter(({ searchableText }) => searchableText.includes(query))
            .slice(0, 20)
            .map(({ post, slug }) => ({
                objectID: post.id,
                title: post.title,
                excerpt: post.excerpt || post.content.slice(0, 180),
                type: 'post',
                slug,
                fields: { slug },
            }))

        return json(
            {
                hits,
                nbHits: hits.length,
                facets: { type: { post: hits.length } },
            },
            200,
            cacheHeaders
        )
    } catch (error) {
        console.error('[local-search]', error)
        return json({ hits: [], nbHits: 0, facets: { type: {} } }, 500, cacheHeaders)
    }
}
