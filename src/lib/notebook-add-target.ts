/**
 * Notebooks a person can add into. Templates and the seeded intro are not theirs.
 * Add buttons ask with this list (and can create a new notebook). They must not
 * call resolveNotebookAddTarget with an empty id — that path is only for a caller
 * that already has no one to ask.
 */
export type NotebookTargetCandidate = {
    id: string
    title?: string
    updatedAt?: string
    isTemplate?: boolean
}

export const NEW_NOTEBOOK_TITLE = 'Research Notes'
const SEEDED_NOTEBOOK_IDS = new Set(['introducing-wim-notebook', 'welcome-notebook', 'welcome'])

export function listNotebookAddTargets<T extends NotebookTargetCandidate>(notebooks: T[] | undefined): T[] {
    const own = (notebooks || []).filter(
        (nb) => nb && nb.id && !nb.isTemplate && !nb.id.startsWith('template-') && !SEEDED_NOTEBOOK_IDS.has(nb.id)
    )
    const time = (nb: T) => {
        const t = Date.parse(nb.updatedAt || '')
        return Number.isFinite(t) ? t : 0
    }
    return [...own].sort((a, b) => time(b) - time(a))
}

export function pickRecentNotebook<T extends NotebookTargetCandidate>(notebooks: T[] | undefined): T | null {
    return listNotebookAddTargets(notebooks)[0] || null
}

export const NOTEBOOK_PICK_ACTION_TYPES = [
    'insert_notebook_block',
    'rewrite_notebook_document',
    'replace_notebook_selection',
    'annotate_notebook',
    'add_notebook_footnote',
    'update_notebook_title',
] as const

/** These cards write into a notebook. The user picks which one; they are not auto-routed. */
export function actionNeedsNotebookPick(type: string | undefined): boolean {
    return Boolean(type && (NOTEBOOK_PICK_ACTION_TYPES as readonly string[]).includes(type))
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
