/**
 * Public site search over posts, community threads, people, and published notebooks.
 * Anon key + RLS only. Response shape (`hits`, `nbHits`, `facets`) stays compatible.
 */
export const runtime = 'edge'

import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { runPublicSearch } from '../../lib/public-search'

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
    const query = String(url.searchParams.get('q') || url.searchParams.get('query') || '').trim()
    const facetFilters = getFacetValues(
        url.searchParams.getAll('facetFilters').length
            ? url.searchParams.getAll('facetFilters')
            : url.searchParams.get('facetFilters')
    )
    const requestedType = facetFilters.find((filter) => filter.startsWith('type:'))?.replace('type:', '')
    const cache = 's-maxage=120, stale-while-revalidate=300'

    if (query.length < 2) {
        return json({ hits: [], nbHits: 0, facets: { type: {} } }, 200, cache)
    }

    if (!isSupabaseConfigured || !supabase) {
        return json({ hits: [], nbHits: 0, facets: { type: {} }, error: 'search_unavailable' }, 200, cache)
    }

    try {
        const { hits, facets } = await runPublicSearch(supabase, query, requestedType)
        return json(
            {
                hits,
                nbHits: hits.length,
                facets: { type: facets },
                engine: 'public-lexical',
            },
            200,
            cache
        )
    } catch (error) {
        console.error('[public-search]', error)
        return json({ hits: [], nbHits: 0, facets: { type: {} }, error: 'search_unavailable' }, 200, cache)
    }
}
