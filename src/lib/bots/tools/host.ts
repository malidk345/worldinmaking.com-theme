import { fetchSupabasePostBySlug, searchSupabasePosts } from '../../supabaseBlog'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../supabase-rest'

export type HostWindow = { path?: string; title?: string }

export type HostUser = {
    id?: string
    name?: string
    username?: string
    bio?: string
    location?: string
    pronouns?: string
    role?: string
    plan?: 'free' | 'pro'
}

export type HostSnapshot = {
    path?: string
    user?: HostUser
    windows?: HostWindow[]
    notebookId?: string
    notebookTitle?: string
    selection?: string
    notebooks?: Array<{ id: string; title: string; content?: string }>
    artifactId?: string
    artifactTitle?: string
    artifactType?: string
    artifactVersion?: number
    artifacts?: Array<{ id: string; title: string; type?: string; version?: number }>
    attachments?: Array<{ name: string; content: string }>
    scratchpad?: {
        documents?: Array<{ name: string; size?: string; type?: string; content?: string; pageCount?: number }>
        nodes?: Array<{ type: string; title?: string; content: string; source?: string }>
        tasks?: Array<{ title: string; status: string }>
        memories?: Array<{ fact: string; category?: string }>
    }
}

export type HostOsAction = {
    type:
        | 'open_window'
        | 'create_notebook'
        | 'create_forum_topic'
        | 'insert_notebook_block'
        | 'rewrite_notebook_document'
        | 'replace_notebook_selection'
        | 'update_notebook_title'
        | 'manage_windows'
        | 'set_system_appearance'
        | 'annotate_notebook'
        | 'publish_to_forum'
        | 'add_notebook_footnote'
    title: string
    description: string
    payload: {
        path?: string
        title?: string
        content?: string
        notebookId?: string
        action?: string
        target?: string
        left_path?: string
        right_path?: string
        theme?: string
        wallpaper?: string
        reduce_transparency?: boolean
        span_text?: string
        note?: string
        category?: string
        marker?: string
        text?: string
    }
}

/** Shared by /api/chat and notebook co-author. */
export function parseHostSnapshot(raw: unknown): HostSnapshot | undefined {
    if (!raw || typeof raw !== 'object') return undefined
    const snap = raw as Record<string, unknown>
    const path = typeof snap.path === 'string' ? snap.path.slice(0, 200) : undefined
    const notebookId = typeof snap.notebookId === 'string' ? snap.notebookId.slice(0, 80) : undefined
    const notebookTitle = typeof snap.notebookTitle === 'string' ? snap.notebookTitle.slice(0, 120) : undefined
    const selection = typeof snap.selection === 'string' ? snap.selection.slice(0, 2500) : undefined
    const artifactId = typeof snap.artifactId === 'string' ? snap.artifactId.slice(0, 80) : undefined
    const artifactTitle = typeof snap.artifactTitle === 'string' ? snap.artifactTitle.slice(0, 120) : undefined
    const artifactType = typeof snap.artifactType === 'string' ? snap.artifactType.slice(0, 40) : undefined
    const artifactVersion =
        typeof snap.artifactVersion === 'number' && Number.isFinite(snap.artifactVersion)
            ? Math.max(1, Math.floor(snap.artifactVersion))
            : undefined
    const artifacts: NonNullable<HostSnapshot['artifacts']> = []
    if (Array.isArray(snap.artifacts)) {
        for (const row of snap.artifacts.slice(0, 16)) {
            if (!row || typeof row !== 'object') continue
            const item = row as { id?: unknown; title?: unknown; type?: unknown; version?: unknown }
            if (typeof item.id !== 'string' || typeof item.title !== 'string') continue
            artifacts.push({
                id: item.id.slice(0, 80),
                title: item.title.slice(0, 120),
                type: typeof item.type === 'string' ? item.type.slice(0, 40) : undefined,
                version:
                    typeof item.version === 'number' && Number.isFinite(item.version)
                        ? Math.max(1, Math.floor(item.version))
                        : undefined,
            })
        }
    }
    const notebooks: NonNullable<HostSnapshot['notebooks']> = []
    if (Array.isArray(snap.notebooks)) {
        for (const notebook of snap.notebooks.slice(0, 20)) {
            if (!notebook || typeof notebook !== 'object') continue
            const item = notebook as { id?: unknown; title?: unknown; content?: unknown }
            if (typeof item.id !== 'string') continue
            notebooks.push({
                id: item.id.slice(0, 80),
                title: typeof item.title === 'string' ? item.title.slice(0, 120) : '',
                content: typeof item.content === 'string' ? item.content.slice(0, 15_000) : undefined,
            })
        }
    }
    const windows: HostSnapshot['windows'] = []
    if (Array.isArray(snap.windows)) {
        for (const window of snap.windows.slice(0, 12)) {
            if (!window || typeof window !== 'object') continue
            const item = window as { path?: unknown; title?: unknown }
            windows.push({
                path: typeof item.path === 'string' ? item.path.slice(0, 200) : undefined,
                title: typeof item.title === 'string' ? item.title.slice(0, 80) : undefined,
            })
        }
    }
    let user: HostSnapshot['user']
    if (snap.user && typeof snap.user === 'object') {
        const u = snap.user as Record<string, unknown>
        user = {
            id: typeof u.id === 'string' ? u.id.slice(0, 80) : undefined,
            name: typeof u.name === 'string' ? u.name.slice(0, 100) : undefined,
            username: typeof u.username === 'string' ? u.username.slice(0, 60) : undefined,
            bio: typeof u.bio === 'string' ? u.bio.slice(0, 300) : undefined,
            location: typeof u.location === 'string' ? u.location.slice(0, 100) : undefined,
            pronouns: typeof u.pronouns === 'string' ? u.pronouns.slice(0, 40) : undefined,
            role: typeof u.role === 'string' ? u.role.slice(0, 40) : undefined,
            plan: u.plan === 'pro' ? 'pro' : u.plan === 'free' ? 'free' : undefined,
        }
    }
    let scratchpad: HostSnapshot['scratchpad']
    if (snap.scratchpad && typeof snap.scratchpad === 'object') {
        const s = snap.scratchpad as Record<string, unknown>
        scratchpad = {
            documents: Array.isArray(s.documents)
                ? s.documents.slice(0, 8).map((d: any) => ({
                      name: String(d.name || 'Document').slice(0, 200),
                      size: typeof d.size === 'string' ? d.size : undefined,
                      type: typeof d.type === 'string' ? d.type : undefined,
                      pageCount:
                          typeof d.pageCount === 'number' && Number.isFinite(d.pageCount)
                              ? Math.max(0, Math.floor(d.pageCount))
                              : undefined,
                      content: typeof d.content === 'string' ? d.content.slice(0, 400_000) : undefined,
                  }))
                : undefined,
            nodes: Array.isArray(s.nodes)
                ? s.nodes.map((n: any) => ({
                      type: String(n.type || 'concept'),
                      title: typeof n.title === 'string' ? n.title : undefined,
                      content: String(n.content || ''),
                      source: typeof n.source === 'string' ? n.source : undefined,
                  }))
                : undefined,
            tasks: Array.isArray(s.tasks)
                ? s.tasks.map((t: any) => ({
                      title: String(t.title || ''),
                      status: String(t.status || 'pending'),
                  }))
                : undefined,
            memories: Array.isArray(s.memories)
                ? s.memories
                      .filter((m: unknown) => m && typeof m === 'object')
                      .slice(0, 24)
                      .map((m: any) => ({
                          fact: String(m.fact || m.content || '').slice(0, 400),
                          category: typeof m.category === 'string' ? m.category.slice(0, 40) : undefined,
                      }))
                      .filter((m: { fact: string }) => m.fact)
                : undefined,
        }
    }
    const attachments: NonNullable<HostSnapshot['attachments']> = []
    if (Array.isArray(snap.attachments)) {
        for (const row of snap.attachments.slice(0, 6)) {
            if (!row || typeof row !== 'object') continue
            const item = row as { name?: unknown; content?: unknown }
            if (typeof item.name !== 'string' || typeof item.content !== 'string') continue
            attachments.push({
                name: item.name.slice(0, 200),
                content: item.content.slice(0, 400_000),
            })
        }
    }
    if (
        !path &&
        !notebookId &&
        !notebooks.length &&
        !windows.length &&
        !selection &&
        !artifactId &&
        !user &&
        !scratchpad &&
        !artifacts.length &&
        !attachments.length
    ) {
        return undefined
    }
    return {
        path,
        user,
        notebookId,
        notebookTitle,
        selection,
        windows,
        notebooks,
        artifactId,
        artifactTitle,
        artifactType,
        artifactVersion,
        artifacts,
        attachments: attachments.length ? attachments : undefined,
        scratchpad,
    }
}

function normArtifactTitle(title: string): string {
    return title.toLowerCase().trim().replace(/[\s\-_]+/g, '')
}

/** Same title (or the open artifact) is a revision, not a second card. */
export function resolveHostArtifact(
    host: HostSnapshot | undefined,
    title: string,
    type?: string
): { id: string; version: number } | undefined {
    if (!host) return undefined
    const want = normArtifactTitle(title)
    if (!want) return undefined
    if (host.artifactId && host.artifactTitle && normArtifactTitle(host.artifactTitle) === want) {
        if (!type || !host.artifactType || host.artifactType === type) {
            return { id: host.artifactId, version: (host.artifactVersion || 1) + 1 }
        }
    }
    const found = (host.artifacts || []).find((item) => {
        if (normArtifactTitle(item.title) !== want) return false
        if (type && item.type && item.type !== type) return false
        return true
    })
    if (!found) return undefined
    return { id: found.id, version: (found.version || 1) + 1 }
}

/** Same-turn memory path: remember writes here so withHostContext and get_workspace see it. */
export function applyRememberedFact(host: HostSnapshot | undefined, fact: string, category?: string): HostSnapshot | undefined {
    const trimmed = fact.trim().slice(0, 400)
    if (!host || !trimmed) return host
    const memories = [...(host.scratchpad?.memories || [])]
    if (memories.some((item) => item.fact === trimmed)) return host
    memories.unshift({ fact: trimmed, category: category?.trim().slice(0, 40) || undefined })
    host.scratchpad = { ...host.scratchpad, memories: memories.slice(0, 48) }
    return host
}

export const SITE_APPS: Array<{ name: string; path: string; aliases: string[] }> = [
    { name: 'Home', path: '/home', aliases: ['desktop', 'ana sayfa'] },
    { name: 'Community', path: '/community', aliases: ['forum', 'questions', 'community'] },
    { name: 'Notebooks', path: '/notebooks', aliases: ['notes', 'notebook'] },
    { name: 'WIM AI', path: '/workspace-chat', aliases: ['ask ai', 'chat', 'wim ai'] },
    { name: 'Assistant', path: '/assistant', aliases: ['personal assistant', 'philosopher', 'asistan'] },
    { name: 'Posts', path: '/posts', aliases: ['blog', 'yazılar', 'posts'] },
    { name: 'Archive', path: '/archive', aliases: ['arsiv'] },
    { name: 'Contact', path: '/contact', aliases: ['iletişim', 'contact'] },
    { name: 'Admin', path: '/admin', aliases: ['dashboard', 'moderation'] },
    { name: 'Profile', path: '/profile', aliases: ['hesap', 'account'] },
    { name: 'Plans', path: '/pricing', aliases: ['pro', 'upgrade', 'pricing', 'fiyatlar', 'planlar', 'subscription', 'membership'] },
    { name: 'Flashcards', path: '/study', aliases: ['flashcards', 'study deck', 'srs', 'study session'] },
    { name: 'Account', path: '/account', aliases: ['account', 'hesap', 'membership', 'cancel', 'delete'] },
    { name: 'Scratchpad', path: '/scratchpad', aliases: ['scratchpad', 'karalama defteri', 'working memory', 'memory', 'notes-draft', 'draft'] },
]

const ALLOWED_PATHS = new Set(SITE_APPS.map((app) => app.path))

function clip(value: string, max: number): string {
    const text = String(value || '')
    return text.length <= max ? text : text.slice(0, max)
}


/** Explicit id/title: fail-closed when missing (export_notebook / generate_flashcards parity —
 * never return ok:true + action under a wrong id that OS Apply will nack). */
function resolveNotebookWriteTarget(
    host: HostSnapshot | undefined,
    notebookId: string | undefined,
    unboundError: string
): { ok: true; id: string; title: string; content?: string } | { ok: false; error: string } {
    const notebooks = host?.notebooks || []
    const requested = clip((notebookId || '').trim(), 80)
    if (requested) {
        const match = notebooks.find(
            (n) => n.id === requested || n.title.toLowerCase() === requested.toLowerCase()
        )
        if (!match) {
            return {
                ok: false,
                error: `Notebook "${requested}" not found. Call list_notebooks to see available notebooks.`,
            }
        }
        return {
            ok: true,
            id: match.id,
            title: match.title || host?.notebookTitle || 'Notebook',
            content: match.content,
        }
    }
    const targetId = host?.notebookId || notebooks[0]?.id || ''
    if (!targetId) {
        return { ok: false, error: unboundError }
    }
    const known = notebooks.find((item) => item.id === targetId)
    return {
        ok: true,
        id: targetId,
        title: known?.title || host?.notebookTitle || 'Notebook',
        content: known?.content,
    }
}


export function resolveOpenPath(raw: string): string | null {
    const value = String(raw || '').trim()
    if (!value) return null
    const asPath = value.startsWith('/') ? value.split('?')[0].replace(/\/+$/, '') || '/' : ''
    if (asPath && ALLOWED_PATHS.has(asPath)) return asPath
    const needle = value.toLowerCase()
    const match = SITE_APPS.find(
        (app) => app.path === asPath || app.name.toLowerCase() === needle || app.aliases.some((alias) => alias === needle)
    )
    return match?.path || null
}

export function describeWorkspace(host?: HostSnapshot, opts?: { nodePreview?: boolean }): string {
    const userLine = host?.user?.name || host?.user?.username
        ? `Logged-in User: ${host.user.name || host.user.username}${host.user.username && host.user.name && host.user.username !== host.user.name ? ` (@${host.user.username})` : ''}${host.user.plan ? ` | desk: ${host.user.plan === 'pro' ? 'study' : 'desk'}` : ''}${host.user.bio ? ` | Bio: ${clip(host.user.bio, 120)}` : ''}${host.user.location ? ` | Location: ${host.user.location}` : ''}${host.user.pronouns ? ` | Pronouns: ${host.user.pronouns}` : ''}${host.user.role ? ` | Role: ${host.user.role}` : ''}`
        : 'User: Guest / Anonymous'
    const windows = (host?.windows || [])
        .slice(0, 12)
        .map((window) => `- ${window.title || 'Window'} (${window.path || '/'})`)
        .join('\n')
    const apps = SITE_APPS.map((app) => `${app.name}: ${app.path}`).join('\n')
    const nodePreview = Boolean(opts?.nodePreview)
    return [
        userLine,
        `Current path: ${host?.path || '/'}`,
        host?.notebookId ? `Bound notebook: ${host.notebookTitle || host.notebookId} (${host.notebookId})` : 'No notebook bound',
        host?.scratchpad?.documents?.length
            ? `Scratchpad Active Documents (${host.scratchpad.documents.length}):\n${host.scratchpad.documents.map((d) => `- ${d.name} (${d.type || 'file'})`).join('\n')}`
            : '',
        host?.scratchpad?.nodes?.length
            ? `Scratchpad nodes (${host.scratchpad.nodes.length}):\n${host.scratchpad.nodes.slice(0, 8).map((n) => {
                  const label = `[${String(n.type || 'note').toUpperCase()}] ${n.title || 'untitled'}`
                  if (!nodePreview) return `- ${label}${n.source ? ` (${n.source})` : ''}`
                  const preview = clip(String(n.content || '').trim(), 80)
                  return `- ${label}${preview ? `: "${preview}"` : ''}${n.source ? ` (${n.source})` : ''}`
              }).join('\n')}`
            : '',
        host?.scratchpad?.memories?.length
            ? `Remembered facts (${host.scratchpad.memories.length}):\n${host.scratchpad.memories
                  .slice(0, 12)
                  .map((m) => `- ${m.category ? `[${m.category}] ` : ''}${m.fact}`)
                  .join('\n')}`
            : '',
        host?.notebooks?.length
            ? `Notebooks (${host.notebooks.length}): ${host.notebooks
                  .slice(0, 8)
                  .map((item) => item.title || item.id)
                  .join(', ')}`
            : '',
        host?.selection ? `Selection: ${clip(host.selection, 400)}` : '',
        host?.artifactId
            ? `Open artifact: ${host.artifactTitle || host.artifactId} (${host.artifactType || 'document'}). Revise with create_artifact using the same title.`
            : '',
        windows ? `Open windows:\n${windows}` : 'No other OS windows reported',
        `Apps:\n${apps}`,
    ]
        .filter(Boolean)
        .join('\n\n')
}

export async function executeGetWorkspace(host?: HostSnapshot): Promise<{ ok: boolean; result: string }> {
    return { ok: true, result: clip(describeWorkspace(host, { nodePreview: true }), 4_000) }
}

export async function executeOpenPath(rawPath: string): Promise<{
    ok: boolean
    result: string
    action?: HostOsAction
}> {
    const path = resolveOpenPath(rawPath)
    if (!path) {
        return {
            ok: false,
            result: JSON.stringify({ ok: false, error: 'path is not an allowed OS app', allowed: SITE_APPS.map((app) => app.path) }),
        }
    }
    const app = SITE_APPS.find((item) => item.path === path)
    return {
        ok: true,
        result: JSON.stringify({ ok: true, path, name: app?.name || path }),
        action: {
            type: 'open_window',
            title: `Open ${app?.name || path}`,
            description: `Open ${path} in the OS`,
            payload: { path },
        },
    }
}

async function searchCommunityTopics(query: string, signal?: AbortSignal): Promise<string[]> {
    if (signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError')
    }
    try {
        const encoded = encodeURIComponent(`*${query}*`)
        const url = `${SUPABASE_URL}/rest/v1/community_posts?or=(title.ilike.${encoded},content.ilike.${encoded})&title=not.ilike.comment_*&select=id,title,created_at&order=created_at.desc&limit=6`
        const res = await fetch(url, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            signal,
        })
        if (!res.ok) return []
        const rows = (await res.json()) as Array<{ id?: string; title?: string }>
        if (!Array.isArray(rows)) return []
        return rows.map((row) => `- ${row.title || 'Untitled'} (/community?id=${row.id})`)
    } catch (err) {
        if (
            signal?.aborted ||
            (err instanceof Error && err.name === 'AbortError')
        ) {
            throw err instanceof Error ? err : new DOMException('The operation was aborted.', 'AbortError')
        }
        return []
    }
}

export async function executeSearchSite(
    query: string,
    signal?: AbortSignal
): Promise<{ ok: boolean; result: string }> {
    const q = clip(query.trim(), 200)
    if (q.length < 2) return { ok: false, result: JSON.stringify({ ok: false, error: 'query required' }) }
    if (signal?.aborted) {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'client request aborted' }) }
    }
    try {
        const posts = await searchSupabasePosts(q, signal)
        if (signal?.aborted) {
            return { ok: false, result: JSON.stringify({ ok: false, error: 'client request aborted' }) }
        }
        const postLines = posts.slice(0, 8).map((post, index) => {
            return `${index + 1}. ${post.title || 'Untitled'}\n   /posts/${post.slug}\n   ${String(post.excerpt || '').slice(0, 180)}`
        })
        const forumLines = await searchCommunityTopics(q, signal)
        if (signal?.aborted) {
            return { ok: false, result: JSON.stringify({ ok: false, error: 'client request aborted' }) }
        }
        const parts = [
            postLines.length ? `Posts:\n${postLines.join('\n\n')}` : 'No posts matched.',
            forumLines.length ? `Forum:\n${forumLines.join('\n')}` : 'No forum threads matched.',
        ]
        return { ok: true, result: clip(`Site search for "${q}":\n${parts.join('\n\n')}`, 4_000) }
    } catch (err) {
        // Fail-closed on Stop: never surface empty "no posts matched" after client abort.
        if (
            signal?.aborted ||
            (Boolean(signal) && err instanceof Error && err.name === 'AbortError')
        ) {
            return { ok: false, result: JSON.stringify({ ok: false, error: 'client request aborted' }) }
        }
        throw err
    }
}

export async function executeReadPost(
    slug: string,
    signal?: AbortSignal
): Promise<{ ok: boolean; result: string }> {
    if (signal?.aborted) {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'client request aborted' }) }
    }
    try {
        const post = await fetchSupabasePostBySlug(clip(slug, 180), signal)
        if (signal?.aborted) {
            return { ok: false, result: JSON.stringify({ ok: false, error: 'client request aborted' }) }
        }
        if (!post) return { ok: false, result: JSON.stringify({ ok: false, error: 'post not found' }) }
        return {
            ok: true,
            result: clip(`# ${post.title}\n/posts/${post.slug}\n\n${post.excerpt || ''}\n\n${String(post.content || '').slice(0, 2500)}`, 4_000),
        }
    } catch (err) {
        // Fail-closed on Stop: never map AbortError to "post not found".
        if (
            signal?.aborted ||
            (Boolean(signal) && err instanceof Error && err.name === 'AbortError')
        ) {
            return { ok: false, result: JSON.stringify({ ok: false, error: 'client request aborted' }) }
        }
        throw err
    }
}

export function executeListNotebooks(host?: HostSnapshot): { ok: boolean; result: string } {
    const notebooks = host?.notebooks || []
    if (!notebooks.length) {
        return { ok: true, result: 'No notebooks in the workspace snapshot. Ask the user to open Notebooks or bind one.' }
    }
    return {
        ok: true,
        result: notebooks.map((item) => `- ${item.title || 'Untitled'} (${item.id})`).join('\n'),
    }
}

export function executeReadNotebook(
    host: HostSnapshot | undefined,
    idOrTitle: string
): { ok: boolean; result: string } {
    const query = clip(idOrTitle.trim(), 120).toLowerCase()
    if (!query) return { ok: false, result: JSON.stringify({ ok: false, error: 'notebook_id or title required' }) }
    const notebooks = host?.notebooks || []
    const match = notebooks.find(
        (n) => n.id.toLowerCase() === query || n.title.toLowerCase() === query || n.title.toLowerCase().includes(query)
    )
    if (!match) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: `Notebook "${idOrTitle}" not found. Call list_notebooks to see available notebooks.`,
            }),
        }
    }
    const content = match.content ? match.content.trim() : '(Notebook is empty)'
    return {
        ok: true,
        result: clip(`# ${match.title || 'Untitled'} (${match.id})\n\n${content}`, 8_000),
    }
}

export function executeCreateNotebook(title: string, content?: string): {
    ok: boolean
    result: string
    action: HostOsAction
} {
    const name = clip(title.trim() || 'AI notes', 80)
    return {
        ok: true,
        result: JSON.stringify({ ok: true, title: name }),
        action: {
            type: 'create_notebook',
            title: `Create notebook: ${name}`,
            description: 'Save and open a workspace notebook',
            payload: { title: name, content: clip(content || '', 8_000) },
        },
    }
}

/** Default cap for one insert_notebook_block payload (matches rewrite_notebook_document). */
export const NOTEBOOK_INSERT_MAX_CHARS = 20_000
/** Hard ceiling callers may request (e.g. a 25-entry annotated bibliography). */
export const NOTEBOOK_INSERT_HARD_MAX_CHARS = 40_000

/**
 * Clips markdown at a block boundary (blank line) instead of mid-sentence so a
 * long insert never ends with half a reference. Reports whether anything was cut.
 */
export function clipNotebookInsert(content: string, max = NOTEBOOK_INSERT_MAX_CHARS): { body: string; truncated: boolean } {
    const text = String(content || '').trim()
    const limit = Math.max(1, Math.min(max, NOTEBOOK_INSERT_HARD_MAX_CHARS))
    if (text.length <= limit) return { body: text, truncated: false }
    const cut = text.slice(0, limit)
    const para = cut.lastIndexOf('\n\n')
    const line = cut.lastIndexOf('\n')
    const at = para > limit * 0.5 ? para : line > limit * 0.5 ? line : limit
    return { body: cut.slice(0, at).trimEnd(), truncated: true }
}

export function executeInsertNotebookBlock(
    host: HostSnapshot | undefined,
    content: string,
    notebookId?: string,
    options: { maxChars?: number } = {}
): { ok: boolean; result: string; action?: HostOsAction; truncated?: boolean } {
    const { body, truncated } = clipNotebookInsert(content, options.maxChars ?? NOTEBOOK_INSERT_MAX_CHARS)
    if (!body) return { ok: false, result: JSON.stringify({ ok: false, error: 'content required' }) }
    const target = resolveNotebookWriteTarget(
        host,
        notebookId,
        'No notebook is bound. Call create_notebook first or ask the user to open one.'
    )
    if (!target.ok) {
        return { ok: false, result: JSON.stringify({ ok: false, error: target.error }) }
    }
    return {
        ok: true,
        truncated,
        result: JSON.stringify({
            ok: true,
            notebookId: target.id,
            title: target.title,
            ...(truncated ? { truncated: true, kept_chars: body.length } : {}),
        }),
        action: {
            type: 'insert_notebook_block',
            title: `Insert into ${target.title}`,
            description: 'Append a block to the notebook',
            payload: { notebookId: target.id, title: target.title, content: body },
        },
    }
}

export function executeRewriteNotebookDocument(
    host: HostSnapshot | undefined,
    content: string,
    notebookId?: string
): { ok: boolean; result: string; action?: HostOsAction } {
    const body = clip(content.trim(), 20_000)
    if (!body) return { ok: false, result: JSON.stringify({ ok: false, error: 'content required' }) }
    const target = resolveNotebookWriteTarget(
        host,
        notebookId,
        'No notebook is bound. Call create_notebook first or ask the user to open one.'
    )
    if (!target.ok) {
        return { ok: false, result: JSON.stringify({ ok: false, error: target.error }) }
    }
    return {
        ok: true,
        result: JSON.stringify({ ok: true, notebookId: target.id, title: target.title }),
        action: {
            type: 'rewrite_notebook_document',
            title: `Rewrite ${target.title}`,
            description: 'Rewrite and restructure the entire notebook content',
            payload: { notebookId: target.id, title: target.title, content: body },
        },
    }
}

export function executeReplaceNotebookSelection(
    host: HostSnapshot | undefined,
    content: string,
    notebookId?: string
): { ok: boolean; result: string; action?: HostOsAction } {
    const body = clip(content.trim(), 8_000)
    if (!body) return { ok: false, result: JSON.stringify({ ok: false, error: 'content required' }) }
    if (!host?.selection?.trim()) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: 'No active selection to replace. Ensure the user has highlighted text first.',
            }),
        }
    }
    const target = resolveNotebookWriteTarget(
        host,
        notebookId,
        'No notebook is bound. Call create_notebook first or ask the user to open one.'
    )
    if (!target.ok) {
        return { ok: false, result: JSON.stringify({ ok: false, error: target.error }) }
    }
    const span_text = clip(host.selection.trim(), 2_500)
    return {
        ok: true,
        result: JSON.stringify({ ok: true, notebookId: target.id, title: target.title, span_text }),
        action: {
            type: 'replace_notebook_selection',
            title: `Replace selection in ${target.title}`,
            description: 'Replace the active user selection with rewritten text',
            payload: { notebookId: target.id, title: target.title, content: body, span_text },
        },
    }
}

export function executeUpdateNotebookTitle(
    host: HostSnapshot | undefined,
    title: string,
    notebookId?: string
): { ok: boolean; result: string; action?: HostOsAction } {
    const name = clip(title.trim(), 120)
    if (!name) return { ok: false, result: JSON.stringify({ ok: false, error: 'title required' }) }
    const target = resolveNotebookWriteTarget(
        host,
        notebookId,
        'No notebook is bound. Call create_notebook first or ask the user to open one.'
    )
    if (!target.ok) {
        return { ok: false, result: JSON.stringify({ ok: false, error: target.error }) }
    }
    return {
        ok: true,
        result: JSON.stringify({ ok: true, notebookId: target.id, title: name }),
        action: {
            type: 'update_notebook_title',
            title: `Rename notebook: ${name}`,
            description: 'Update the notebook title',
            payload: { notebookId: target.id, title: name },
        },
    }
}

export function executeManageWindows(
    _host: HostSnapshot | undefined,
    action: string,
    path?: string,
    leftPath?: string,
    rightPath?: string
): { ok: boolean; result: string; action: HostOsAction } {
    const act = clip((action || 'tile').trim(), 40)
    const primary = path ? resolveOpenPath(path) || path : undefined
    const left = leftPath ? resolveOpenPath(leftPath) || leftPath : undefined
    const right = rightPath ? resolveOpenPath(rightPath) || rightPath : undefined
    return {
        ok: true,
        result: JSON.stringify({ ok: true, action: act, path: primary, left_path: left, right_path: right }),
        action: {
            type: 'manage_windows',
            title: `Window layout: ${act}`,
            description: 'Organize desktop windows',
            payload: { action: act, path: primary, left_path: left, right_path: right },
        },
    }
}

export function executeSetSystemAppearance(
    theme?: string,
    wallpaper?: string,
    reduceTransparency?: boolean
): { ok: boolean; result: string; action: HostOsAction } {
    const cleanTheme = theme ? clip(theme.trim().toLowerCase(), 20) : undefined
    const cleanWallpaper = wallpaper ? clip(wallpaper.trim().toLowerCase(), 60) : undefined
    return {
        ok: true,
        result: JSON.stringify({ ok: true, theme: cleanTheme, wallpaper: cleanWallpaper, reduce_transparency: reduceTransparency }),
        action: {
            type: 'set_system_appearance',
            title: `System appearance: ${cleanTheme || cleanWallpaper || 'updated'}`,
            description: 'Update visual theme and desktop styling',
            payload: { theme: cleanTheme, wallpaper: cleanWallpaper, reduce_transparency: reduceTransparency },
        },
    }
}

export function executeAnnotateNotebook(
    host: HostSnapshot | undefined,
    spanText: string,
    note: string,
    notebookId?: string
): { ok: boolean; result: string; action?: HostOsAction } {
    const quote = clip((spanText || '').trim(), 500)
    const comment = clip((note || '').trim(), 2_000)
    if (!quote || !comment) {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'span_text and note are both required' }) }
    }
    const target = resolveNotebookWriteTarget(
        host,
        notebookId,
        'No notebook is bound. Open a notebook first to add annotations.'
    )
    if (!target.ok) {
        return { ok: false, result: JSON.stringify({ ok: false, error: target.error }) }
    }
    return {
        ok: true,
        result: JSON.stringify({
            ok: true,
            notebookId: target.id,
            title: target.title,
            span_text: quote,
            note: comment,
        }),
        action: {
            type: 'annotate_notebook',
            title: `Annotate in ${target.title}`,
            description: 'Attach inline critique or margin note',
            payload: { notebookId: target.id, title: target.title, span_text: quote, note: comment },
        },
    }
}

export function executePublishToForum(
    title: string,
    content: string,
    category?: string
): { ok: boolean; result: string; action: HostOsAction } {
    const topicTitle = clip((title || '').trim(), 140)
    const topicBody = clip((content || '').trim(), 12_000)
    const tag = category ? clip(category.trim(), 40) : 'discussion'
    return {
        ok: true,
        result: JSON.stringify({ ok: true, title: topicTitle, category: tag }),
        action: {
            type: 'publish_to_forum',
            title: `Forum topic: ${topicTitle}`,
            description: 'Publish a new topic to the Community forum',
            payload: { title: topicTitle, content: topicBody, category: tag },
        },
    }
}

export function executeAddNotebookFootnote(
    host: HostSnapshot | undefined,
    text: string,
    spanText?: string,
    marker?: string,
    notebookId?: string
): { ok: boolean; result: string; action?: HostOsAction } {
    const fnText = clip((text || '').trim(), 2_000)
    if (!fnText) {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'text (footnote explanation or citation) is required' }) }
    }
    const target = resolveNotebookWriteTarget(
        host,
        notebookId,
        'No notebook is bound. Open or create a notebook first to add footnotes.'
    )
    if (!target.ok) {
        return { ok: false, result: JSON.stringify({ ok: false, error: target.error }) }
    }
    const quote = spanText ? clip(spanText.trim(), 500) : undefined

    let resolvedMarker = marker ? clip(marker.trim(), 40) : ''
    if (!resolvedMarker) {
        const content = target.content || host?.selection || ''
        const matches = content.match(/\[\^([0-9]+)\]/g) || []
        const existingNums = matches
            .map((m) => parseInt(m.slice(2, -1), 10))
            .filter((n) => !isNaN(n))
        const nextNum = existingNums.length ? Math.max(...existingNums) + 1 : 1
        resolvedMarker = String(nextNum)
    }

    return {
        ok: true,
        result: JSON.stringify({
            ok: true,
            notebookId: target.id,
            title: target.title,
            marker: resolvedMarker,
            text: fnText,
            span_text: quote,
        }),
        action: {
            type: 'add_notebook_footnote',
            title: `Add footnote [^${resolvedMarker}] in ${target.title}`,
            description: quote
                ? `Attach footnote [^${resolvedMarker}] to "${clip(quote, 36)}"`
                : `Append footnote [^${resolvedMarker}] to notebook`,
            payload: {
                notebookId: target.id,
                title: target.title,
                marker: resolvedMarker,
                text: fnText,
                span_text: quote,
            },
        },
    }
}


