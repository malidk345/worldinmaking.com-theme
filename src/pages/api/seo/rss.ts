/**
 * RSS 2.0 feed of public posts — edge-safe.
 */
export const runtime = 'edge'

import { SITE, formatSeoDescription, pageCanonical, toPlainText } from '../../../lib/seo'
import { fetchSupabasePostsPage } from '../../../lib/supabaseBlog'

function xmlEscape(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 })
    }

    const page = await fetchSupabasePostsPage({ limit: 40, offset: 0 })
    const items = page.posts
        .map((post) => {
            const slug = String(post.slug || '')
                .replace(/^\/+/, '')
                .replace(/^(posts|blog)\//, '')
            if (!slug) return ''
            const url = pageCanonical(`/posts/${slug}`)
            const description = formatSeoDescription(toPlainText(post.excerpt || post.title))
            const date = post.created_at ? new Date(post.created_at).toUTCString() : ''
            return `    <item>
      <title>${xmlEscape(post.title || slug)}</title>
      <link>${xmlEscape(url)}</link>
      <guid isPermaLink="true">${xmlEscape(url)}</guid>
      ${date ? `<pubDate>${xmlEscape(date)}</pubDate>` : ''}
      <description>${xmlEscape(description)}</description>
    </item>`
        })
        .filter(Boolean)
        .join('\n')

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(SITE.name)}</title>
    <link>${xmlEscape(SITE.url)}</link>
    <description>${xmlEscape(SITE.defaultDescription)}</description>
    <language>en</language>
${items}
  </channel>
</rss>
`

    return new Response(body, {
        status: 200,
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
        },
    })
}
