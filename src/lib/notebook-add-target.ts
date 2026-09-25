/**
 * Where chat "Add to notebook" goes when no notebook editor is bound or open:
 * the user's most recently updated notebook (templates and the seeded intro are not
 * "theirs"), else a new notebook created through the normal createNotebook path.
 */
export type NotebookTargetCandidate = {
    id: string
    title?: string
    updatedAt?: string
    isTemplate?: boolean
}

export const NEW_NOTEBOOK_TITLE = 'Research Notes'
const SEEDED_NOTEBOOK_IDS = new Set(['introducing-wim-notebook', 'welcome-notebook', 'welcome'])

export function pickRecentNotebook<T extends NotebookTargetCandidate>(notebooks: T[] | undefined): T | null {
    const own = (notebooks || []).filter(
        (nb) => nb && nb.id && !nb.isTemplate && !nb.id.startsWith('template-') && !SEEDED_NOTEBOOK_IDS.has(nb.id)
    )
    if (own.length === 0) return null
    const time = (nb: T) => {
        const t = Date.parse(nb.updatedAt || '')
        return Number.isFinite(t) ? t : 0
    }
    return [...own].sort((a, b) => time(b) - time(a))[0]
}

export type NotebookAddTarget = { id: string; title: string; created: boolean }

/**
 * Resolve the target id: explicit/bound/open notebook first, then most recent, then create.
 * `create` is only called when the user has no notebook of their own.
 */
export function resolveNotebookAddTarget(input: {
    preferredId?: string
    preferredTitle?: string
    notebooks: NotebookTargetCandidate[]
    create: (title: string) => { id: string; title?: string }
}): NotebookAddTarget {
    if (input.preferredId) {
        return { id: input.preferredId, title: input.preferredTitle || 'Notebook', created: false }
    }
    const recent = pickRecentNotebook(input.notebooks)
    if (recent) return { id: recent.id, title: recent.title || 'Notebook', created: false }
    const made = input.create(NEW_NOTEBOOK_TITLE)
    return { id: made.id, title: made.title || NEW_NOTEBOOK_TITLE, created: true }
}
