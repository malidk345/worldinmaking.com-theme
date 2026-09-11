/**
 * Extract @mention user ids from notebook markdown and write in-app notifications.
 * Service role only.
 */
import { supabaseAdmin } from './supabase-admin'

const MENTION_TAG_RE = /<mention\s+id=(?:"([^"]+)"|'([^']+)')/gi
const MENTIONED_IDS_RE = /mentionedIds["']?\s*[:=]\s*["']([^"']+)["']/gi
const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HANDLE_RE = /^[a-zA-Z0-9_.-]{2,64}$/

export function extractNotebookMentionTokens(content: string): { ids: string[]; handles: string[] } {
    const ids = new Set<string>()
    const handles = new Set<string>()
    if (!content) return { ids: [], handles: [] }

    const take = (raw: string): void => {
        const value = raw.trim()
        if (!value) return
        if (UUID_RE.test(value)) ids.add(value.toLowerCase())
        else if (HANDLE_RE.test(value)) handles.add(value.toLowerCase())
    }

    for (const match of content.matchAll(MENTION_TAG_RE)) {
        take(match[1] || match[2] || '')
    }
    for (const match of content.matchAll(MENTIONED_IDS_RE)) {
        for (const part of match[1].split(/[,\s]+/)) take(part)
    }
    return { ids: Array.from(ids), handles: Array.from(handles) }
}

export function extractNotebookMentionUserIds(content: string): string[] {
    return extractNotebookMentionTokens(content).ids
}

/** Reply ids inside `<Comment replies={[…]} />` so we can notify on new threads. */
export function extractDiscussionReplyIds(content: string): string[] {
    if (!content || !content.includes('replies=')) return []
    const ids: string[] = []
    for (const parsed of extractJsonArrayLiterals(content, 'replies=')) {
        if (!Array.isArray(parsed)) continue
        for (const entry of parsed) {
            if (!entry || typeof entry !== 'object') continue
            const id = (entry as { id?: unknown }).id
            if (typeof id === 'string' && id.trim()) ids.push(id.trim())
        }
    }
    return ids
}

function extractJsonArrayLiterals(content: string, token: string): unknown[] {
    const out: unknown[] = []
    let from = 0
    while (from < content.length) {
        const start = content.indexOf(token, from)
        if (start < 0) break
        const open = content.indexOf('[', start + token.length)
        if (open < 0) break
        let depth = 0
        let inStr = false
        let esc = false
        let end = -1
        for (let i = open; i < content.length; i++) {
            const ch = content[i]
            if (inStr) {
                if (esc) {
                    esc = false
                    continue
                }
                if (ch === '\\') {
                    esc = true
                    continue
                }
                if (ch === '"') inStr = false
                continue
            }
            if (ch === '"') {
                inStr = true
                continue
            }
            if (ch === '[') depth += 1
            else if (ch === ']') {
                depth -= 1
                if (depth === 0) {
                    end = i
                    break
                }
            }
        }
        if (end < 0) break
        try {
            out.push(JSON.parse(content.slice(open, end + 1)))
        } catch {
            /* ignore malformed reply blobs */
        }
        from = end + 1
    }
    return out
}

async function resolveProfileIds(ids: string[], handles: string[]): Promise<string[]> {
    const found = new Set<string>()
    if (ids.length) {
        const { data, error } = await supabaseAdmin.from('profiles').select('id').in('id', ids)
        if (error) throw error
        for (const row of (data as { id: string }[] | null) || []) found.add(row.id)
    }
    if (handles.length) {
        const { data, error } = await supabaseAdmin.from('profiles').select('id, username').in('username', handles)
        if (error) throw error
        const matched = new Set(
            ((data as { id: string; username: string | null }[] | null) || [])
                .map((row) => (row.username || '').toLowerCase())
                .filter(Boolean)
        )
        const missing = handles.filter((handle) => !matched.has(handle))
        for (const row of (data as { id: string }[] | null) || []) found.add(row.id)
        // Case-insensitive fallback for handles the exact `.in` missed.
        for (const handle of missing) {
            const { data: row, error: lookupError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .ilike('username', handle)
                .maybeSingle()
            if (lookupError) throw lookupError
            if (row?.id) found.add(row.id)
        }
    }
    return Array.from(found)
}

async function upsertOpenNotification(input: {
    userId: string
    notebookId: string
    kind: 'mention' | 'comment'
    actorId: string | null
    excerpt: string
}): Promise<void> {
    let query = supabaseAdmin
        .from('wim_notebook_notifications')
        .select('id')
        .eq('user_id', input.userId)
        .eq('notebook_id', input.notebookId)
        .eq('kind', input.kind)
        .is('dismissed_at', null)
    query = input.actorId ? query.eq('actor_id', input.actorId) : query.is('actor_id', null)
    const { data: open } = await query.maybeSingle()
    if (open?.id) {
        await supabaseAdmin
            .from('wim_notebook_notifications')
            .update({ excerpt: input.excerpt, created_at: new Date().toISOString() })
            .eq('id', open.id)
        return
    }
    const { error } = await supabaseAdmin.from('wim_notebook_notifications').insert({
        user_id: input.userId,
        notebook_id: input.notebookId,
        kind: input.kind,
        actor_id: input.actorId,
        excerpt: input.excerpt,
    })
    if (error && error.code !== '23505') throw error
}

export async function notifyNotebookMentions(input: {
    notebookId: string
    title?: string
    content: string
    previousContent?: string
    actorId?: string | null
}): Promise<void> {
    const actorId = input.actorId || null
    const tokens = extractNotebookMentionTokens(input.content)
    if (!tokens.ids.length && !tokens.handles.length) return

    // Re-typing around an existing mention must not re-resolve profiles or re-write
    // the same notification rows on every autosave tick. Only act when the mention
    // set itself actually changed.
    if (input.previousContent) {
        const previous = extractNotebookMentionTokens(input.previousContent)
        if (
            previous.ids.length === tokens.ids.length &&
            previous.handles.length === tokens.handles.length &&
            previous.ids.every((id, index) => id === tokens.ids[index]) &&
            previous.handles.every((handle, index) => handle === tokens.handles[index])
        ) {
            return
        }
    }

    const valid = await resolveProfileIds(tokens.ids, tokens.handles)
    const excerpt = (input.title || 'Notebook').trim().slice(0, 180)

    for (const userId of valid) {
        if (actorId && userId === actorId) continue
        await upsertOpenNotification({
            userId,
            notebookId: input.notebookId,
            kind: 'mention',
            actorId,
            excerpt,
        })
    }
}

export async function notifyNotebookComments(input: {
    notebookId: string
    title?: string
    previousContent?: string
    content: string
    actorId?: string | null
    ownerUserId?: string | null
}): Promise<void> {
    const actorId = input.actorId || null
    if (!actorId) return
    const previous = new Set(extractDiscussionReplyIds(input.previousContent || ''))
    const nextIds = extractDiscussionReplyIds(input.content)
    const added = nextIds.filter((id) => !previous.has(id))
    if (!added.length) return

    const recipients = new Set<string>()
    if (input.ownerUserId && input.ownerUserId !== actorId) recipients.add(input.ownerUserId)

    const { data: collabs, error } = await supabaseAdmin
        .from('wim_notebook_collaborators')
        .select('user_id')
        .eq('notebook_id', input.notebookId)
    if (error) throw error
    for (const row of (collabs as { user_id: string }[] | null) || []) {
        if (row.user_id && row.user_id !== actorId) recipients.add(row.user_id)
    }
    if (!recipients.size) return

    const excerpt = (input.title || 'Notebook').trim().slice(0, 180)
    for (const userId of recipients) {
        await upsertOpenNotification({
            userId,
            notebookId: input.notebookId,
            kind: 'comment',
            actorId,
            excerpt,
        })
    }
}
