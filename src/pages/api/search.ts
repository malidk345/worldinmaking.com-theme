import type { NextApiRequest, NextApiResponse } from 'next'
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

const getFacetValues = (value: string | string[] | undefined): string[] => {
    if (!value) return []
    return (Array.isArray(value) ? value : [value]).flatMap((item) => item.split(','))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    const query = String(req.query.q || '').trim().toLowerCase()
    const facetFilters = getFacetValues(req.query.facetFilters)
    const requestedType = facetFilters.find((filter) => filter.startsWith('type:'))?.replace('type:', '')

    if (query.length < 2) {
        return res.status(200).json({ hits: [], nbHits: 0, facets: { type: {} } })
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

        return res.status(200).json({
            hits,
            nbHits: hits.length,
            facets: { type: { post: hits.length } },
        })
    } catch (error) {
        console.error('[local-search]', error)
        return res.status(500).json({ hits: [], nbHits: 0, facets: { type: {} } })
    }
}
