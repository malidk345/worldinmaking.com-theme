/**
 * Bidirectional WikiLink & Backlink Utilities — worldinmaking (wim)
 *
 * Parses [[Target Notebook Title]] or [[notebook-id|Custom Label]] syntax,
 * resolves target notebooks, and calculates dynamic backlinks between documents.
 */

export interface WikiLinkMatch {
    raw: string
    target: string
    label: string
    index: number
}

export interface BacklinkItem {
    sourceNotebookId: string
    sourceTitle: string
    contextSnippet: string
    updatedAt?: string
}

const WIKILINK_REGEX = /\[\[([^[\]|]+)(?:\|([^[\]|]+))?\]\]/g

/**
 * Extracts all [[WikiLinks]] present in a markdown or plain text string.
 */
export function extractWikiLinks(text: string): WikiLinkMatch[] {
    if (!text || typeof text !== 'string') return []
    const matches: WikiLinkMatch[] = []
    let match: RegExpExecArray | null

    // Reset lastIndex for safety
    WIKILINK_REGEX.lastIndex = 0

    while ((match = WIKILINK_REGEX.exec(text)) !== null) {
        const raw = match[0]
        const target = match[1]?.trim() || ''
        const label = match[2]?.trim() || target
        if (target) {
            matches.push({
                raw,
                target,
                label,
                index: match.index,
            })
        }
    }

    return matches
}

/**
 * Checks if a document contains a reference to a specific notebook (by title or id).
 */
export function documentReferencesNotebook(
    docContent: string,
    targetNotebook: { id: string; title?: string }
): { hasReference: boolean; snippet: string } {
    if (!docContent || !targetNotebook) return { hasReference: false, snippet: '' }

    const links = extractWikiLinks(docContent)
    const targetTitleLower = (targetNotebook.title || '').trim().toLowerCase()
    const targetIdLower = (targetNotebook.id || '').trim().toLowerCase()

    for (const link of links) {
        const linkTargetLower = link.target.toLowerCase()
        if (
            (targetTitleLower && linkTargetLower === targetTitleLower) ||
            (targetIdLower && linkTargetLower === targetIdLower)
        ) {
            // Extract snippet around the reference
            const start = Math.max(0, link.index - 80)
            const end = Math.min(docContent.length, link.index + link.raw.length + 80)
            let snippet = docContent.slice(start, end).replace(/\n+/g, ' ').trim()
            if (start > 0) snippet = `…${snippet}`
            if (end < docContent.length) snippet = `${snippet}…`
            return { hasReference: true, snippet }
        }
    }

    return { hasReference: false, snippet: '' }
}

/**
 * Computes all incoming backlinks for a target notebook from a collection of notebooks.
 */
export function computeBacklinks(
    currentNotebook: { id: string; title?: string },
    allNotebooks: Array<{ id: string; title?: string; text_content?: string; content?: string; updated_at?: string }>
): BacklinkItem[] {
    if (!currentNotebook || !allNotebooks || !Array.isArray(allNotebooks)) return []

    const backlinks: BacklinkItem[] = []

    for (const nb of allNotebooks) {
        // Skip referencing self
        if (nb.id === currentNotebook.id) continue

        const body = nb.text_content || nb.content || ''
        const { hasReference, snippet } = documentReferencesNotebook(body, currentNotebook)

        if (hasReference) {
            backlinks.push({
                sourceNotebookId: nb.id,
                sourceTitle: nb.title || 'Untitled Notebook',
                contextSnippet: snippet,
                updatedAt: nb.updated_at,
            })
        }
    }

    return backlinks
}
