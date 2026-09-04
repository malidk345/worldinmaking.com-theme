/**
 * Dynamic sitemap for worldinmaking.com — edge-safe Web Response API.
 */
export const runtime = 'edge'

import { SITE, canonicalPath } from '../../../lib/seo'
import { fetchSupabasePostsPage } from '../../../lib/supabaseBlog'
import { fetchWithCache, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../../lib/supabase-rest'

const STATIC_PATHS = [
    '/',
    '/about',
    '/posts',
    '/questions',
    '/notebooks',
    '/community',
    '/archive',
    '/contact',
    '/pricing',
    '/terms',
    '/privacy',
    '/cookies',
    '/refund',
    '/guidelines',
    '/copyright',
    '/dpa',
    '/subprocessors',
]

const MAX_POSTS = 2000
const MAX_QUESTIONS = 500
const PAGE = 40

function xmlEscape(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function loc(path: string): string {
    const clean = canonicalPath(path)
    return clean === '/' ? `${SITE.url}/` : `${SITE.url}${clean}`
}

function urlTag(path: string, lastmod?: string, priority = '0.6'): string {
    const last = lastmod ? `\n    <lastmod>${xmlEscape(lastmod.slice(0, 10))}</lastmod>` : ''
    return `  <url>\n    <loc>${xmlEscape(loc(path))}</loc>${last}\n    <priority>${priority}</priority>\n  </url>`
}

async function fetchQuestionIds(): Promise<{ id: string; created_at?: string }[]> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return []
    try {
        const url = `${SUPABASE_URL}/rest/v1/community_posts?select=id,created_at,title&title=not.ilike.comment_*&order=created_at.desc&limit=${MAX_QUESTIONS}`
        const rows = await fetchWithCache(url)
        if (!Array.isArray(rows)) return []
        return rows
            .filter((row) => row && row.id != null && !String(row.title || '').startsWith('comment_'))
            .map((row) => ({ id: String(row.id), created_at: row.created_at }))
    } catch (error) {
        console.error('[sitemap] community_posts', error)
        return []
    }
}

async function fetchPublicProfiles(): Promise<{ username: string; updated_at?: string }[]> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return []
    try {
        const url = `${SUPABASE_URL}/rest/v1/profiles?select=username,updated_at&username=not.is.null&order=updated_at.desc&limit=300`
        const rows = await fetchWithCache(url)
        if (!Array.isArray(rows)) return []
        return rows
            .filter((row) => row && typeof row.username === 'string' && row.username.trim().length > 1)
            .map((row) => ({ username: row.username.trim(), updated_at: row.updated_at }))
    } catch (error) {
        console.error('[sitemap] profiles', error)
        return []
    }
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 })
    }

    const urls: string[] = STATIC_PATHS.map((path) => urlTag(path, undefined, path === '/' ? '1.0' : '0.8'))

    let offset = 0
    let collected = 0
    while (collected < MAX_POSTS) {
        const page = await fetchSupabasePostsPage({ limit: PAGE, offset })
        if (!page.posts.length) break
        for (const post of page.posts) {
            const slug = String(post.slug || '')
                .replace(/^\/+/, '')
                .replace(/^(posts|blog)\//, '')
            if (!slug) continue
            urls.push(urlTag(`/posts/${slug}`, post.created_at, '0.7'))
            collected += 1
            if (collected >= MAX_POSTS) break
        }
        if (!page.hasMore || page.posts.length < PAGE) break
        offset += PAGE
    }

    const questions = await fetchQuestionIds()
    for (const question of questions) {
        if (!/^\d+$/.test(question.id)) continue
        urls.push(urlTag(`/questions/${question.id}`, question.created_at, '0.6'))
    }

    const profiles = await fetchPublicProfiles()
    for (const profile of profiles) {
        urls.push(urlTag(`/community/profiles/${encodeURIComponent(profile.username)}`, profile.updated_at, '0.5'))
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
        '\n'
    )}\n</urlset>\n`

    return new Response(body, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
        },
    })
}
