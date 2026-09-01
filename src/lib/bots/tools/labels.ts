/** User-visible labels for the tool workbench. One map for stream steps and the chat chrome. */

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
    read_document: ['Reading document', 'Read document', 'Could not read document'],
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

function clipSummary(value: string, max = 140): string {
    const text = value.replace(/\s+/g, ' ').trim()
    if (!text) return ''
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

/** One-line outcome for the workbench row. Never "Artifact created" for unrelated tools. */
export function toolResultSummary(name: string, ok: boolean, result: string): string {
    if (!ok) {
        try {
            const parsed = JSON.parse(result) as { error?: unknown }
            if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
                return clipSummary(parsed.error, 160)
            }
        } catch {
            /* plain error body */
        }
        return clipSummary(result, 160) || toolStatusLabel(name, 'error')
    }
    if (name === 'web_search' || name === 'search_site') {
        const lines = result.split('\n').filter((line) => line.trim() && !line.startsWith('UNTRUSTED') && !line.startsWith('Site search'))
        return clipSummary(lines[0] || 'Search complete')
    }
    if (name === 'fetch_url') {
        const first = result.split('\n').find((line) => line.trim() && !line.startsWith('UNTRUSTED'))
        return clipSummary(first || 'Page fetched')
    }
    try {
        const parsed = JSON.parse(result) as { title?: unknown; path?: unknown; name?: unknown; ok?: unknown }
        if (typeof parsed.title === 'string' && parsed.title.trim()) return clipSummary(parsed.title)
        if (typeof parsed.path === 'string' && parsed.path.trim()) return parsed.path
        if (typeof parsed.name === 'string' && parsed.name.trim()) return parsed.name
    } catch {
        /* not json */
    }
    return toolStatusLabel(name, 'done')
}
