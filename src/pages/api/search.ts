/**
 * Local search over Supabase posts and notebooks with hybrid semantic scoring.
 * Response shape (`hits`, `nbHits`, `facets`) is kept so existing clients stay compatible.
 * Cloudflare Pages (next-on-pages) requires Edge Runtime + Web Response API.
 */
export const runtime = 'edge'

import { searchSupabasePosts } from '../../lib/supabaseBlog'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { searchSemanticDocuments, type SemanticDocument } from '../../lib/semantic-search'

type SearchHit = {
    objectID: string
    title: string
    excerpt: string
    type: string
    slug: string
    fields: { slug: string; type?: string }
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

async function searchNotebooks(query: string): Promise<SearchHit[]> {
    if (!isSupabaseConfigured || !supabase) return []
    try {
        const { data, error } = await supabase
            .from('notebooks')
            .select('id, title, text_content, content, updated_at')
            .or(`title.ilike.%${query}%,text_content.ilike.%${query}%`)
            .limit(25)

        if (error || !data || data.length === 0) return []

        const docs: SemanticDocument[] = data.map((nb: any) => ({
            id: nb.id,
            title: nb.title || 'Untitled Notebook',
            content: nb.text_content || (typeof nb.content === 'string' ? nb.content : JSON.stringify(nb.content || '')) || '',
            type: 'notebook',
            slug: `/notebooks/${nb.id}`,
        }))

        const semanticHits = searchSemanticDocuments(query, docs, 15)
        return semanticHits.map((h) => ({
            objectID: h.objectID,
            title: h.title,
            excerpt: h.excerpt,
            type: 'notebook',
            slug: h.slug,
            fields: { slug: h.slug, type: 'notebook' },
        }))
    } catch (e) {
        console.error('[searchNotebooks]', e)
        return []
    }
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return json({ error: 'Method not allowed' }, 405)
    }

    const url = new URL(req.url)
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
        let postHits: SearchHit[] = []
        let notebookHits: SearchHit[] = []

        if (!requestedType || requestedType === 'post') {
            const posts = await searchSupabasePosts(query)
            const postDocs: SemanticDocument[] = posts.map((post) => ({
                id: post.id,
                title: post.title,
                content: post.excerpt || post.content || '',
                type: 'post',
                slug: post.slug || `/posts/${post.id}`,
            }))
            const semanticPosts = searchSemanticDocuments(query, postDocs, 15)
            postHits = semanticPosts.map((h) => ({
                objectID: h.objectID,
                title: h.title,
                excerpt: h.excerpt,
                type: 'post',
                slug: h.slug.startsWith('/') ? h.slug : `/posts/${h.slug}`,
                fields: { slug: h.slug.startsWith('/') ? h.slug : `/posts/${h.slug}` },
            }))
        }

        if (!requestedType || requestedType === 'notebook') {
            notebookHits = await searchNotebooks(query)
        }

        const combinedHits = [...notebookHits, ...postHits]
        const typeFacets: Record<string, number> = {}
        if (postHits.length > 0) typeFacets.post = postHits.length
        if (notebookHits.length > 0) typeFacets.notebook = notebookHits.length

        return json(
            {
                hits: combinedHits.slice(0, 20),
                nbHits: combinedHits.length,
                facets: { type: typeFacets },
                engine: 'supabase-hybrid-semantic',
            },
            200,
            cache
        )
    } catch (error) {
        console.error('[local-search]', error)
        return json({ hits: [], nbHits: 0, facets: { type: {} }, error: 'search_unavailable' }, 200, cache)
    }
}
