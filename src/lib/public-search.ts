/**
 * Public site search. Anon Supabase only — RLS must hide drafts, private
 * notebooks, inner thoughts, and PII. Never use the service role here.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { notebookPublicPath } from './window-path'
import { profileHref } from './profile-path'
import { searchLexicalDocuments, type SemanticDocument } from './semantic-search'

export const PUBLIC_SEARCH_TYPES = ['post', 'community', 'person', 'notebook'] as const
export type PublicSearchType = (typeof PUBLIC_SEARCH_TYPES)[number]

export type PublicSearchHit = {
    objectID: string
    title: string
    excerpt: string
    type: PublicSearchType
    slug: string
    fields: { slug: string; type?: string }
}

const PER_TYPE = 8

export function sanitizeSearchNeedle(raw: string): string {
    return String(raw || '')
        .replace(/[%_,.()"'\\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80)
}

export function isPublicSearchType(value: string | null | undefined): value is PublicSearchType {
    return !!value && (PUBLIC_SEARCH_TYPES as readonly string[]).includes(value)
}

function hit(partial: PublicSearchHit): PublicSearchHit {
    return {
        ...partial,
        fields: { slug: partial.slug, type: partial.type, ...partial.fields },
    }
}

function excerptOf(text: string, max = 180): string {
    return String(text || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[#>*_`~\-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max)
}

function publicNotebookTitle(row: { title?: string | null; publish?: Record<string, unknown> | null }): string {
    const pub = row.publish || {}
    const publicTitle = typeof pub.publicTitle === 'string' ? pub.publicTitle.trim() : ''
    return publicTitle || String(row.title || 'Untitled notebook').trim() || 'Untitled notebook'
}

function publicNotebookBody(row: { content?: unknown; publish?: Record<string, unknown> | null }): string {
    const pub = row.publish || {}
    const subtitle = typeof pub.subtitle === 'string' ? pub.subtitle : ''
    const tags = Array.isArray(pub.tags) ? pub.tags.filter((t) => typeof t === 'string').join(' ') : ''
    const category = typeof pub.category === 'string' ? pub.category : ''
    const content = typeof row.content === 'string' ? row.content : ''
    return [subtitle, category, tags, content].filter(Boolean).join('\n')
}

function rank(query: string, docs: SemanticDocument[], type: PublicSearchType): PublicSearchHit[] {
    return searchLexicalDocuments(query, docs, PER_TYPE).map((h) =>
        hit({
            objectID: h.objectID,
            title: h.title,
            excerpt: h.excerpt,
            type,
            slug: h.slug,
            fields: { slug: h.slug, type },
        })
    )
}

export async function searchPublicPosts(
    supabase: SupabaseClient,
    query: string
): Promise<PublicSearchHit[]> {
    const needle = sanitizeSearchNeedle(query)
    if (needle.length < 2) return []
    const { data, error } = await supabase
        .from('posts')
        .select('id, title, slug, excerpt, content')
        .eq('published', true)
        .or(`title.ilike.%${needle}%,excerpt.ilike.%${needle}%,content.ilike.%${needle}%`)
        .order('created_at', { ascending: false })
        .limit(25)
    if (error || !data?.length) return []
    const docs: SemanticDocument[] = data.map((row) => {
        const slugRaw = String(row.slug || row.id)
        const slug = slugRaw.startsWith('/') ? slugRaw : `/posts/${slugRaw.replace(/^(posts|blog)\//, '')}`
        return {
            id: String(row.id),
            title: String(row.title || 'Untitled'),
            content: String(row.excerpt || row.content || ''),
            type: 'post',
            slug,
        }
    })
    return rank(query, docs, 'post')
}

export async function searchPublicCommunity(
    supabase: SupabaseClient,
    query: string
): Promise<PublicSearchHit[]> {
    const needle = sanitizeSearchNeedle(query)
    if (needle.length < 2) return []
    const { data, error } = await supabase
        .from('community_posts')
        .select('id, title, content, post_slug, is_archived')
        .eq('is_archived', false)
        .or(`title.ilike.%${needle}%,content.ilike.%${needle}%`)
        .order('created_at', { ascending: false })
        .limit(25)
    if (error || !data?.length) return []
    const docs: SemanticDocument[] = data.map((row) => {
        const permalink = String(row.post_slug || row.id)
        const slug = `/questions/${permalink}`
        return {
            id: `community-${row.id}`,
            title: String(row.title || 'Untitled thread'),
            content: String(row.content || ''),
            type: 'post',
            slug,
        }
    })
    return rank(query, docs, 'community')
}

export async function searchPublicPeople(
    supabase: SupabaseClient,
    query: string
): Promise<PublicSearchHit[]> {
    const needle = sanitizeSearchNeedle(query)
    if (needle.length < 2) return []
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, bio, avatar_url, is_bot')
        .not('username', 'is', null)
        .or(
            `username.ilike.%${needle}%,first_name.ilike.%${needle}%,last_name.ilike.%${needle}%,bio.ilike.%${needle}%`
        )
        .limit(30)
    if (error || !data?.length) return []
    const hits: PublicSearchHit[] = []
    for (const row of data) {
        if (row.is_bot === true) continue
        const username = String(row.username || '').trim()
        const href = profileHref(username)
        if (!href) continue
        const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || username
        hits.push(
            hit({
                objectID: `person-${row.id}`,
                title: name,
                excerpt: excerptOf(String(row.bio || `@${username}`)),
                type: 'person',
                slug: href,
                fields: { slug: href, type: 'person' },
            })
        )
        if (hits.length >= PER_TYPE) break
    }
    return hits
}

export async function searchPublicNotebooks(
    supabase: SupabaseClient,
    query: string
): Promise<PublicSearchHit[]> {
    const needle = sanitizeSearchNeedle(query)
    if (needle.length < 2) return []
    const { data, error } = await supabase
        .from('wim_notebooks')
        .select('id, short_id, title, content, publish')
        .eq('is_published', true)
        .is('deleted_at', null)
        .or(
            `title.ilike.%${needle}%,content.ilike.%${needle}%,publish->>publicTitle.ilike.%${needle}%,publish->>subtitle.ilike.%${needle}%`
        )
        .limit(25)
    if (error || !data?.length) return []
    const docs: SemanticDocument[] = data.map((row) => {
        const publicId = String(row.short_id || row.id)
        return {
            id: String(row.id),
            title: publicNotebookTitle(row),
            content: publicNotebookBody(row),
            type: 'notebook',
            slug: notebookPublicPath(publicId),
        }
    })
    return rank(query, docs, 'notebook')
}

export async function runPublicSearch(
    supabase: SupabaseClient,
    query: string,
    requestedType?: string | null
): Promise<{ hits: PublicSearchHit[]; facets: Record<string, number> }> {
    const type = isPublicSearchType(requestedType) ? requestedType : null
    const tasks: Array<Promise<PublicSearchHit[]>> = []
    if (!type || type === 'post') tasks.push(searchPublicPosts(supabase, query))
    if (!type || type === 'community') tasks.push(searchPublicCommunity(supabase, query))
    if (!type || type === 'person') tasks.push(searchPublicPeople(supabase, query))
    if (!type || type === 'notebook') tasks.push(searchPublicNotebooks(supabase, query))

    const groups = await Promise.all(tasks)
    const hits = groups.flat()
    const facets: Record<string, number> = {}
    for (const item of hits) {
        facets[item.type] = (facets[item.type] || 0) + 1
    }
    return { hits: hits.slice(0, 24), facets }
}
