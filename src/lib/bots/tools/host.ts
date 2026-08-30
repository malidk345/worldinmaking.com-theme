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
            plan: u.plan === 'pro' ? 'pro' : 'free',
        }
    }
    if (!path && !notebookId && !notebooks.length && !windows.length && !selection && !artifactId && !user) return undefined
    return { path, user, notebookId, notebookTitle, selection, windows, notebooks, artifactId, artifactTitle, artifactType }
}

export const SITE_APPS: Array<{ name: string; path: string; aliases: string[] }> = [
    { name: 'Home', path: '/home', aliases: ['desktop', 'ana sayfa'] },
    { name: 'Community', path: '/community', aliases: ['forum', 'questions', 'community'] },
    { name: 'Notebooks', path: '/notebooks', aliases: ['notes', 'notebook'] },
    { name: 'WIM AI', path: '/workspace-chat', aliases: ['ask ai', 'chat', 'wim ai'] },
    { name: 'Posts', path: '/posts', aliases: ['blog', 'yazılar', 'posts'] },
    { name: 'Archive', path: '/archive', aliases: ['arsiv'] },
    { name: 'Contact', path: '/contact', aliases: ['iletişim', 'contact'] },
    { name: 'Admin', path: '/admin', aliases: ['dashboard', 'moderation'] },
    { name: 'Profile', path: '/profile', aliases: ['hesap', 'account'] },
    { name: 'Pricing', path: '/pricing', aliases: ['pro', 'upgrade', 'fiyatlar', 'planlar', 'subscription', 'membership'] },
]

const ALLOWED_PATHS = new Set(SITE_APPS.map((app) => app.path))

function clip(value: string, max: number): string {
    const text = String(value || '')
    return text.length <= max ? text : text.slice(0, max)
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

export function describeWorkspace(host?: HostSnapshot): string {
    const userLine = host?.user?.name || host?.user?.username
        ? `Logged-in User: ${host.user.name || host.user.username}${host.user.username && host.user.name && host.user.username !== host.user.name ? ` (@${host.user.username})` : ''}${host.user.plan ? ` | Plan: ${host.user.plan.toUpperCase()}` : ''}${host.user.bio ? ` | Bio: ${clip(host.user.bio, 120)}` : ''}${host.user.location ? ` | Location: ${host.user.location}` : ''}${host.user.pronouns ? ` | Pronouns: ${host.user.pronouns}` : ''}${host.user.role ? ` | Role: ${host.user.role}` : ''}`
        : 'User: Guest / Anonymous'
    const windows = (host?.windows || [])
        .slice(0, 12)
        .map((window) => `- ${window.title || 'Window'} (${window.path || '/'})`)
        .join('\n')
    const apps = SITE_APPS.map((app) => `${app.name}: ${app.path}`).join('\n')
    return [
        userLine,
        `Current path: ${host?.path || '/'}`,
        host?.notebookId ? `Bound notebook: ${host.notebookTitle || host.notebookId} (${host.notebookId})` : 'No notebook bound',
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
    return { ok: true, result: clip(describeWorkspace(host), 4_000) }
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

async function searchCommunityTopics(query: string): Promise<string[]> {
    try {
        const encoded = encodeURIComponent(`*${query}*`)
        const url = `${SUPABASE_URL}/rest/v1/community_posts?or=(title.ilike.${encoded},content.ilike.${encoded})&title=not.ilike.comment_*&select=id,title,created_at&order=created_at.desc&limit=6`
        const res = await fetch(url, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
        })
        if (!res.ok) return []
        const rows = (await res.json()) as Array<{ id?: string; title?: string }>
        if (!Array.isArray(rows)) return []
        return rows.map((row) => `- ${row.title || 'Untitled'} (/community?id=${row.id})`)
    } catch {
        return []
    }
}

export async function executeSearchSite(query: string): Promise<{ ok: boolean; result: string }> {
    const q = clip(query.trim(), 200)
    if (q.length < 2) return { ok: false, result: JSON.stringify({ ok: false, error: 'query required' }) }
    const posts = await searchSupabasePosts(q)
    const postLines = posts.slice(0, 8).map((post, index) => {
        return `${index + 1}. ${post.title || 'Untitled'}\n   /posts/${post.slug}\n   ${String(post.excerpt || '').slice(0, 180)}`
    })
    const forumLines = await searchCommunityTopics(q)
    const parts = [
        postLines.length ? `Posts:\n${postLines.join('\n\n')}` : 'No posts matched.',
        forumLines.length ? `Forum:\n${forumLines.join('\n')}` : 'No forum threads matched.',
    ]
    return { ok: true, result: clip(`Site search for "${q}":\n${parts.join('\n\n')}`, 4_000) }
}

export async function executeReadPost(slug: string): Promise<{ ok: boolean; result: string }> {
    const post = await fetchSupabasePostBySlug(clip(slug, 180))
    if (!post) return { ok: false, result: JSON.stringify({ ok: false, error: 'post not found' }) }
    return {
        ok: true,
        result: clip(`# ${post.title}\n/posts/${post.slug}\n\n${post.excerpt || ''}\n\n${String(post.content || '').slice(0, 2500)}`, 4_000),
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

export function executeInsertNotebookBlock(
    host: HostSnapshot | undefined,
    content: string,
    notebookId?: string
): { ok: boolean; result: string; action?: HostOsAction } {
    const body = clip(content.trim(), 8_000)
    if (!body) return { ok: false, result: JSON.stringify({ ok: false, error: 'content required' }) }
    const requested = clip((notebookId || '').trim(), 80)
    const targetId = requested || host?.notebookId || host?.notebooks?.[0]?.id || ''
    if (!targetId) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: 'No notebook is bound. Call create_notebook first or ask the user to open one.',
            }),
        }
    }
    const known = host?.notebooks?.find((item) => item.id === targetId)
    const title = known?.title || host?.notebookTitle || 'Notebook'
    return {
        ok: true,
        result: JSON.stringify({ ok: true, notebookId: targetId, title }),
        action: {
            type: 'insert_notebook_block',
            title: `Insert into ${title}`,
            description: 'Append a block to the notebook',
            payload: { notebookId: targetId, title, content: body },
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
    const requested = clip((notebookId || '').trim(), 80)
    const targetId = requested || host?.notebookId || host?.notebooks?.[0]?.id || ''
    if (!targetId) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: 'No notebook is bound. Call create_notebook first or ask the user to open one.',
            }),
        }
    }
    const known = host?.notebooks?.find((item) => item.id === targetId)
    const title = known?.title || host?.notebookTitle || 'Notebook'
    return {
        ok: true,
        result: JSON.stringify({ ok: true, notebookId: targetId, title }),
        action: {
            type: 'rewrite_notebook_document',
            title: `Rewrite ${title}`,
            description: 'Rewrite and restructure the entire notebook content',
            payload: { notebookId: targetId, title, content: body },
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
    const requested = clip((notebookId || '').trim(), 80)
    const targetId = requested || host?.notebookId || host?.notebooks?.[0]?.id || ''
    if (!targetId) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: 'No notebook is bound. Call create_notebook first or ask the user to open one.',
            }),
        }
    }
    const known = host?.notebooks?.find((item) => item.id === targetId)
    const title = known?.title || host?.notebookTitle || 'Notebook'
    return {
        ok: true,
        result: JSON.stringify({ ok: true, notebookId: targetId, title }),
        action: {
            type: 'replace_notebook_selection',
            title: `Replace selection in ${title}`,
            description: 'Replace the active user selection with rewritten text',
            payload: { notebookId: targetId, title, content: body },
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
    const requested = clip((notebookId || '').trim(), 80)
    const targetId = requested || host?.notebookId || host?.notebooks?.[0]?.id || ''
    if (!targetId) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: 'No notebook is bound. Call create_notebook first or ask the user to open one.',
            }),
        }
    }
    return {
        ok: true,
        result: JSON.stringify({ ok: true, notebookId: targetId, title: name }),
        action: {
            type: 'update_notebook_title',
            title: `Rename notebook: ${name}`,
            description: 'Update the notebook title',
            payload: { notebookId: targetId, title: name },
        },
    }
}

export function executeManageWindows(
    host: HostSnapshot | undefined,
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
    const requested = clip((notebookId || '').trim(), 80)
    const targetId = requested || host?.notebookId || host?.notebooks?.[0]?.id || ''
    if (!targetId) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: 'No notebook is bound. Open a notebook first to add annotations.',
            }),
        }
    }
    const known = host?.notebooks?.find((item) => item.id === targetId)
    const title = known?.title || host?.notebookTitle || 'Notebook'
    return {
        ok: true,
        result: JSON.stringify({ ok: true, notebookId: targetId, title, span_text: quote, note: comment }),
        action: {
            type: 'annotate_notebook',
            title: `Annotate in ${title}`,
            description: 'Attach inline critique or margin note',
            payload: { notebookId: targetId, title, span_text: quote, note: comment },
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

