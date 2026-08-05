export interface LocalSearchHit {
    objectID: string
    title: string
    excerpt: string
    type: string
    slug: string
    fields: { slug: string }
}

interface LocalSearchResponse {
    hits: LocalSearchHit[]
    nbHits: number
    facets?: Record<string, Record<string, number>>
}

interface SearchRequest {
    indexName?: string
    params?: string | Record<string, unknown>
}

const parseParams = (params?: SearchRequest['params']): Record<string, string> => {
    if (!params) return {}
    if (typeof params === 'string') return Object.fromEntries(new URLSearchParams(params))
    return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)]))
}

const searchLocalContent = async (query: string, params?: SearchRequest['params']): Promise<LocalSearchResponse> => {
    const searchParams = new URLSearchParams({ q: query, ...parseParams(params) })
    const response = await fetch(`/api/search?${searchParams.toString()}`)
    if (!response.ok) throw new Error(`Local search failed with ${response.status}`)
    return response.json()
}

// Keep the InstantSearch-compatible surface so existing search UIs do not need
// to know whether the index is remote or backed by our own Next.js API.
export const algoliaSearchClient = {
    search: async (requests: SearchRequest[]) => ({
        results: await Promise.all(
            requests.map((request) => searchLocalContent(parseParams(request.params).query || '', request.params))
        ),
    }),
    initIndex: (_indexName: string) => ({
        search: (query: string, params?: SearchRequest['params']) => searchLocalContent(query, params),
    }),
}

export const algoliaIndexName = 'local-content'
