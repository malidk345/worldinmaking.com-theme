/**
 * Several NotebookApp instances (one per notebook window) all listen for the same
 * window-level `wimNotebook*` events. Without coordination each instance handled the
 * event, so one click could write twice, ack twice and navigate other windows.
 *
 * Rule: the instance currently editing the target notebook handles it; otherwise the
 * first instance to see the event claims it (the claim is stored on the shared detail).
 */

type ClaimWindow = Window & { __wimNotebookEditors?: Map<string, string | null> }

function editors(): Map<string, string | null> {
    const w = window as ClaimWindow
    if (!w.__wimNotebookEditors) w.__wimNotebookEditors = new Map()
    return w.__wimNotebookEditors
}

/** Record which notebook (if any) an editor instance currently shows. */
export function setNotebookEditorTarget(instanceId: string, notebookId: string | null): void {
    if (typeof window === 'undefined') return
    editors().set(instanceId, notebookId)
}

export function removeNotebookEditor(instanceId: string): void {
    if (typeof window === 'undefined') return
    editors().delete(instanceId)
}

/** True when this instance should handle the event; claims it on the shared detail. */
export function claimNotebookEvent(detail: Record<string, unknown> | null | undefined, instanceId: string): boolean {
    if (!detail || typeof detail !== 'object') return true
    const claimedBy = detail.__wimClaimedBy
    if (typeof claimedBy === 'string') return claimedBy === instanceId
    const targetId = typeof detail.notebookId === 'string' ? detail.notebookId : ''
    if (targetId && typeof window !== 'undefined') {
        for (const [id, editing] of Array.from(editors())) {
            if (editing === targetId && id !== instanceId) return false
        }
    }
    try {
        Object.defineProperty(detail, '__wimClaimedBy', { value: instanceId, enumerable: false, configurable: true })
    } catch {
        return true
    }
    return true
}
