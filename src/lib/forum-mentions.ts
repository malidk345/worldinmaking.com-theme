import { supabase } from 'lib/supabase'
import { profileHref } from 'lib/profile-path'
import { resolvePhilosopherAvatar } from 'lib/philosopher-avatar'

export type MentionCandidate = {
    id: string
    username: string
    avatar_url?: string | null
    is_bot?: boolean | null
}

const HANDLE = /(?:^|[\s(>])@([A-Za-z][\w.-]{0,31})/g
const OLD_HANDLE = /@([A-Za-z][\w.-]{0,31})\/\d+/g
const MENTION_ATTR = /data-mention=["']([^"']+)["']/gi

export function normalizeMentionHandle(raw: string): string {
    return String(raw || '')
        .trim()
        .replace(/^@/, '')
        .replace(/\/\d+$/, '')
}

export function extractMentionHandles(input: string): string[] {
    const text = String(input || '')
    const found = new Set<string>()
    for (const match of text.matchAll(MENTION_ATTR)) {
        const handle = normalizeMentionHandle(match[1] || '')
        if (handle) found.add(handle)
    }
    const stripped = text.replace(/<[^>]+>/g, ' ')
    for (const match of stripped.matchAll(OLD_HANDLE)) {
        const handle = normalizeMentionHandle(match[1] || '')
        if (handle) found.add(handle)
    }
    for (const match of stripped.matchAll(HANDLE)) {
        const handle = normalizeMentionHandle(match[1] || '')
        if (handle) found.add(handle)
    }
    return [...found]
}

export function mentionChipHtml(username: string): string {
    const handle = normalizeMentionHandle(username)
    const safe = handle
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
    return `<span class="forum-mention" data-mention="${safe}" contenteditable="false">@${safe}</span>`
}

export function decorateForumMentions(input: string): string {
    const raw = String(input || '')
    if (!raw) return raw
    const withOld = raw.replace(OLD_HANDLE, (_all, name) => mentionChipHtml(name))
    return withOld.replace(HANDLE, (all, name, offset) => {
        const start = offset + (all.startsWith('@') ? 0 : 1)
        const before = withOld.slice(Math.max(0, start - 24), start)
        if (/data-mention=["'][^"']*$/i.test(before) || /<span[^>]*forum-mention[^>]*>$/i.test(before)) {
            return all
        }
        const prefix = all.startsWith('@') ? '' : all[0]
        return `${prefix}${mentionChipHtml(name)}`
    })
}

export function forumMentionClassName(): string {
    return 'forum-mention inline-flex items-center align-baseline px-1.5 py-px rounded-sm border border-navy text-navy bg-navy/10 font-semibold no-underline hover:bg-navy/15'
}

export async function searchMentionCandidates(
    query: string,
    inThread: MentionCandidate[] = []
): Promise<MentionCandidate[]> {
    const q = normalizeMentionHandle(query).toLowerCase()
    const seen = new Set<string>()
    const out: MentionCandidate[] = []
    for (const row of inThread) {
        const username = normalizeMentionHandle(row.username)
        if (!username || seen.has(username.toLowerCase())) continue
        if (q && !username.toLowerCase().includes(q)) continue
        seen.add(username.toLowerCase())
        out.push({
            ...row,
            username,
            avatar_url: resolvePhilosopherAvatar(username, row.avatar_url) || row.avatar_url,
        })
    }
    if (out.length >= 8) return out.slice(0, 8)
    try {
        let request = supabase
            .from('profiles')
            .select('id, username, avatar_url, is_bot')
            .not('username', 'is', null)
            .limit(8)
        if (q) request = request.ilike('username', `%${q.replace(/[%_,]/g, '')}%`)
        const { data } = await request
        for (const row of data || []) {
            const username = normalizeMentionHandle(row.username)
            if (!username || seen.has(username.toLowerCase())) continue
            seen.add(username.toLowerCase())
            out.push({
                id: String(row.id),
                username,
                avatar_url: resolvePhilosopherAvatar(username, row.avatar_url) || row.avatar_url,
                is_bot: row.is_bot,
            })
        }
    } catch (error) {
        console.warn('[forum-mentions] search', error)
    }
    return out.slice(0, 8)
}

export async function persistForumMentions(params: {
    postId: number | string
    replyId: number | string
    authorId: string
    content: string
}): Promise<void> {
    const handles = extractMentionHandles(params.content)
    if (handles.length === 0) return
    const orFilter = handles
        .slice(0, 12)
        .map((handle) => `username.ilike.${handle.replace(/[,()]/g, '')}`)
        .join(',')
    const { data: rows } = await supabase.from('profiles').select('id, username').or(orFilter)
    const byName = new Map(
        (rows || []).map((row) => [String(row.username || '').toLowerCase(), row] as const)
    )
    const payload = handles
        .map((handle) => {
            const profile = byName.get(handle.toLowerCase())
            if (!profile?.id || String(profile.id) === String(params.authorId)) return null
            return {
                post_id: Number(params.postId),
                reply_id: Number(params.replyId),
                mentioned_user_id: profile.id,
                mentioned_username: profile.username || handle,
                author_id: params.authorId,
            }
        })
        .filter(Boolean)
    if (payload.length === 0) return
    const { error } = await supabase.from('forum_mentions').insert(payload)
    if (error) console.warn('[forum-mentions] persist', error.message)
}

export function mentionProfileHref(username: string): string {
    return profileHref(username) || `/profile/${encodeURIComponent(normalizeMentionHandle(username))}`
}
