/**
 * Local InstantSearch-compatible search over Supabase posts.
 * Cloudflare Pages (next-on-pages) requires Edge Runtime + Web Response API.
 */
export const runtime = 'edge'

import { searchSupabasePosts } from '../../lib/supabaseBlog'

type SearchHit = {
    objectID: string
    title: string
    excerpt: string
    type: string
    slug: string
    fields: { slug: string }
}

const getFacetValues = (value: string | string[] | null): string[] => {
    if (!value) return []
    const list = Array.isArray(value) ? value : [value]
    return list.flatMap((item) => String(item).split(','))
}

function json(body: Record<string, unknown>, status = 200, cache?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (cache) headers['Cache-Control'] = cache
    return new Response(JSON.stringify(body), { status, headers })
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return json({ error: 'Method not allowed' }, 405)
    }

    const url = new URL(req.url)
    // InstantSearch sends both `q` (our client) and `query` (Algolia-style params)
    const query = String(url.searchParams.get('q') || url.searchParams.get('query') || '').trim()
    const facetFilters = getFacetValues(url.searchParams.getAll('facetFilters').length
        ? url.searchParams.getAll('facetFilters')
        : url.searchParams.get('facetFilters'))
    const requestedType = facetFilters.find((filter) => filter.startsWith('type:'))?.replace('type:', '')

    const cache = 's-maxage=300, stale-while-revalidate=600'

    if (query.length < 2) {
        return json({ hits: [], nbHits: 0, facets: { type: {} } }, 200, cache)
    }

    try {
        if (requestedType && requestedType !== 'post') {
            return json({ hits: [], nbHits: 0, facets: { type: {} } }, 200, cache)
        }

        // FTS via search_posts RPC when migration applied; ILIKE fallback otherwise
        const posts = await searchSupabasePosts(query)
        const hits: SearchHit[] = posts.slice(0, 20).map((post) => {
            const rawSlug = post.slug || post.id
            const slug = String(rawSlug).startsWith('/') ? String(rawSlug) : `/posts/${rawSlug}`
            return {
                objectID: post.id,
                title: post.title,
                excerpt: post.excerpt || (post.content || '').slice(0, 180),
                type: 'post',
                slug,
                fields: { slug },
            }
        })

        return json(
            {
                hits,
                nbHits: hits.length,
                facets: { type: { post: hits.length } },
                // Hint for operators / future clients — does not change InstantSearch contract
                engine: 'supabase-fts-or-ilike',
            },
            200,
            cache
        )
    } catch (error) {
        console.error('[local-search]', error)
        // Soft-fail: empty results (no mock posts) so UI stays usable
        return json({ hits: [], nbHits: 0, facets: { type: {} }, error: 'search_unavailable' }, 200, cache)
    }
}
