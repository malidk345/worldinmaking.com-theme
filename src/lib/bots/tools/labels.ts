/** User-visible labels for the tool workbench. One map for stream steps and the chat chrome. */

import { scrubSecretMaterial } from 'lib/ai/scrub'

export type ToolRunStatus = 'running' | 'done' | 'error'

const LABELS: Record<string, [string, string, string]> = {
    web_search: ['Searching the web', 'Searched the web', 'Web search failed'],
    create_artifact: ['Creating artifact', 'Created artifact', 'Artifact failed'],
    fetch_url: ['Fetching page', 'Fetched page', 'Page fetch failed'],
    get_workspace: ['Looking at the OS', 'Looked at the OS', 'Workspace lookup failed'],
    search_site: ['Searching the site', 'Searched the site', 'Site search failed'],
    open_path: ['Opening a window', 'Opened a window', 'Could not open window'],
    read_post: ['Reading post', 'Read post', 'Could not read post'],
    list_notebooks: ['Listing notebooks', 'Listed notebooks', 'Could not list notebooks'],
    create_notebook: ['Creating notebook', 'Created notebook', 'Could not create notebook'],
    insert_notebook_block: ['Writing to notebook', 'Wrote to notebook', 'Could not write to notebook'],
    rewrite_notebook_document: ['Rewriting notebook', 'Rewrote notebook', 'Could not rewrite notebook'],
    replace_notebook_selection: ['Revising selection', 'Revised selection', 'Could not revise selection'],
    update_notebook_title: ['Renaming notebook', 'Renamed notebook', 'Could not rename notebook'],
    read_notebook: ['Reading notebook', 'Read notebook', 'Could not read notebook'],
    manage_windows: ['Managing windows', 'Arranged windows', 'Could not arrange windows'],
    set_system_appearance: ['Updating appearance', 'Updated appearance', 'Could not update appearance'],
    annotate_notebook: ['Adding notebook note', 'Added notebook note', 'Could not add note'],
    publish_to_forum: ['Publishing to forum', 'Published to forum', 'Could not publish to forum'],
    read_document: ['Reading document context', 'Document context loaded', 'Could not read document'],
    write_scratchpad: ['Extracting knowledge node', 'Saved node to scratchpad', 'Could not save node'],
    todo_write: ['Planning', 'Updated plan', 'Could not update plan'],
    switch_mode: ['Switching mode', 'Switched mode', 'Could not switch mode'],
    remember: ['Saving memory', 'Saved memory', 'Could not save memory'],
    finalize_plan: ['Starting the plan', 'Started the plan', 'Could not start the plan'],
    task: ['Running subtask', 'Finished subtask', 'Subtask failed'],
}

export function toolStatusLabel(name: string, status: ToolRunStatus): string {
    const row = LABELS[name]
    if (!row) {
        if (status === 'running') return `Using ${name}`
        if (status === 'error') return `${name} failed`
        return `Used ${name}`
    }
    if (status === 'running') return row[0]
    if (status === 'error') return row[2]
    return row[1]
}

function pickArg(args: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
        const value = args[key]
        if (typeof value === 'string' && value.trim()) return clipSummary(value, 72)
    }
    return ''
}

/** Short argument preview for the workbench (query, URL, path, title). */
export function parseToolArgPreview(name: string, raw?: string): string {
    if (!raw) return ''
    try {
        const args = JSON.parse(raw) as Record<string, unknown>
        if (!args || typeof args !== 'object' || Array.isArray(args)) return ''
        if (name === 'web_search' || name === 'search_site') return pickArg(args, ['query', 'q', 'search'])
        if (name === 'fetch_url') return pickArg(args, ['url', 'uri', 'href'])
        if (name === 'open_path') return pickArg(args, ['path', 'app', 'route'])
        if (name === 'read_post') return pickArg(args, ['slug', 'id'])
        if (name === 'read_document') return pickArg(args, ['name', 'url', 'query'])
        if (name === 'read_notebook') return pickArg(args, ['notebook_id', 'notebookId', 'title'])
        if (name === 'create_artifact' || name === 'create_notebook' || name === 'publish_to_forum') {
            return pickArg(args, ['title', 'name'])
        }
        if (name === 'task') return pickArg(args, ['goal', 'prompt'])
        if (name === 'remember') return pickArg(args, ['fact', 'memory'])
        if (name === 'write_scratchpad') return pickArg(args, ['title', 'content'])
        if (name === 'manage_windows') return pickArg(args, ['action', 'path'])
        return pickArg(args, ['title', 'query', 'path', 'url', 'goal'])
    } catch {
        return ''
    }
}

/** Running-row title that includes the query/URL when we have arguments. */
export function toolActivityTitle(name: string, status: ToolRunStatus, args?: string): string {
    const base = toolStatusLabel(name, status)
    const preview = parseToolArgPreview(name, args)
    if (!preview) return base
    if (name === 'web_search' || name === 'search_site') {
        if (status === 'running') return `Searching: ${preview}`
        if (status === 'error') return `Search failed: ${preview}`
        return `Searched: ${preview}`
    }
    if (name === 'fetch_url') {
        if (status === 'running') return `Fetching ${preview}`
        if (status === 'error') return `Failed ${preview}`
        return `Fetched ${preview}`
    }
    return `${base}: ${preview}`
}

function clipSummary(value: string, max = 140): string {
    const text = value.replace(/\s+/g, ' ').trim()
    if (!text) return ''
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function humanToolError(name: string, raw: string): string {
    const text = scrubSecretMaterial(raw).replace(/\s+/g, ' ').trim()
    const lower = text.toLowerCase()
    if (lower.includes('query required') || lower.includes('query cannot')) return 'Need a search query'
    if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
        return 'Timed out — try again'
    }
    if (lower.includes('blocked') || lower.includes('private') || lower.includes('not allowed')) {
        return name === 'fetch_url' ? 'That page isn’t reachable' : 'That action isn’t allowed'
    }
    if (lower.includes('not found') || lower.includes('no notebook')) return 'Couldn’t find that notebook'
    if (text.length > 120 && (text.startsWith('{') || text.startsWith('['))) return toolStatusLabel(name, 'error')
    return clipSummary(text, 80) || toolStatusLabel(name, 'error')
}

/** One-line outcome for the workbench row. Never "Artifact created" for unrelated tools. */
export function toolResultSummary(name: string, ok: boolean, result: string): string {
    if (!ok) {
        try {
            const parsed = JSON.parse(result) as { error?: unknown }
            if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
                return humanToolError(name, parsed.error)
            }
        } catch {
            /* plain error body */
        }
        return humanToolError(name, result)
    }
    if (name === 'web_search' || name === 'search_site') {
        const lines = result.split('\n').filter((line) => line.trim() && !line.startsWith('UNTRUSTED') && !line.startsWith('Site search'))
        return clipSummary(scrubSecretMaterial(lines[0] || 'Search complete'))
    }
    if (name === 'fetch_url') {
        const first = result.split('\n').find((line) => line.trim() && !line.startsWith('UNTRUSTED'))
        return clipSummary(scrubSecretMaterial(first || 'Page fetched'))
    }
    try {
        const parsed = JSON.parse(result) as { title?: unknown; path?: unknown; name?: unknown; ok?: unknown }
        if (typeof parsed.title === 'string' && parsed.title.trim()) return clipSummary(scrubSecretMaterial(parsed.title))
        if (typeof parsed.path === 'string' && parsed.path.trim()) return scrubSecretMaterial(parsed.path)
        if (typeof parsed.name === 'string' && parsed.name.trim()) return scrubSecretMaterial(parsed.name)
    } catch {
        /* not json */
    }
    return toolStatusLabel(name, 'done')
}
