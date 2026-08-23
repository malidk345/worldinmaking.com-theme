export type LocalSearchHit = {
    objectID: string
    title: string
    excerpt: string
    type: string
    slug: string
    fields: { slug: string }
}

export type LocalSearchResponse = {
    hits: LocalSearchHit[]
    nbHits: number
    facets?: { type?: Record<string, number> }
}

export async function fetchLocalSearch(
    query: string,
    type?: string | null,
    signal?: AbortSignal
): Promise<LocalSearchResponse> {
    const q = query.trim()
    if (q.length < 2) {
        return { hits: [], nbHits: 0, facets: { type: {} } }
    }

    const params = new URLSearchParams({ q })
    if (type) params.append('facetFilters', `type:${type}`)

    const res = await fetch(`/api/search?${params.toString()}`, { signal })
    if (!res.ok) {
        throw new Error(`search failed: ${res.status}`)
    }
    return res.json()
}
