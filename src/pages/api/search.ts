import type { NextApiRequest, NextApiResponse } from 'next'
import { searchSupabasePosts } from '../../lib/supabaseBlog'

// Node runtime (not edge): Pages API uses res.setHeader / res.status which edge lacks.
// Edge was previously set and caused: "res.setHeader is not a function" → 500.

type SearchHit = {
    objectID: string
    title: string
    excerpt: string
    type: string
    slug: string
    fields: { slug: string }
}

const getFacetValues = (value: string | string[] | undefined): string[] => {
    if (!value) return []
    return (Array.isArray(value) ? value : [value]).flatMap((item) => item.split(','))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

    // InstantSearch sends both `q` (our client) and `query` (Algolia-style params)
    const query = String(req.query.q || req.query.query || '').trim()
    const facetFilters = getFacetValues(req.query.facetFilters)
    const requestedType = facetFilters.find((filter) => filter.startsWith('type:'))?.replace('type:', '')

    if (query.length < 2) {
        return res.status(200).json({ hits: [], nbHits: 0, facets: { type: {} } })
    }

    try {
        if (requestedType && requestedType !== 'post') {
            return res.status(200).json({ hits: [], nbHits: 0, facets: { type: {} } })
        }

        const posts = await searchSupabasePosts(query)
        const hits: SearchHit[] = posts.slice(0, 20).map((post) => {
            const slug = post.slug.startsWith('/') ? post.slug : `/posts/${post.slug}`
            return {
                objectID: post.id,
                title: post.title,
                excerpt: post.excerpt || (post.content || '').slice(0, 180),
                type: 'post',
                slug,
                fields: { slug },
            }
        })

        return res.status(200).json({
            hits,
            nbHits: hits.length,
            facets: { type: { post: hits.length } },
        })
    } catch (error) {
        console.error('[local-search]', error)
        // Soft-fail: empty results (no mock posts) so UI stays usable
        return res.status(200).json({ hits: [], nbHits: 0, facets: { type: {} }, error: 'search_unavailable' })
    }
}

