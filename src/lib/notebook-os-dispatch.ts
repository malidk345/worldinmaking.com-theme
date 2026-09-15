/**
 * Durable notebook OS event dispatch.
 *
 * Race: callers often `addWindow(notebookPath)` then `dispatchEvent(wimNotebook*)`
 * in the same tick. If NotebookApp's window listeners are not mounted yet, the
 * event is lost and chat waits for the 5s ack timeout.
 *
 * Strategy: if a listener is already alive, dispatch immediately; otherwise
 * optionally open the notebook window and retry until the listener mounts or
 * we time out (fail-closed — do not dispatch into the void).
 */

export const WIM_NOTEBOOK_OS_LISTENER_COUNT_KEY = '__wimNotebookOsListenerCount' as const

export type NotebookOsDispatchOptions = {
    notebookId?: string
    path?: string
    maxWaitMs?: number
    retryIntervalMs?: number
    /** Invoked once when the listener is not yet alive (typically `addWindow`). */
    open?: () => void
}

type ListenerCountWindow = Window & {
    [WIM_NOTEBOOK_OS_LISTENER_COUNT_KEY]?: number
}

/** True when NotebookApp has registered its `wimNotebook*` window listeners. */
export function isNotebookOsListenerAlive(): boolean {
    if (typeof window === 'undefined') return false
    const count = (window as ListenerCountWindow)[WIM_NOTEBOOK_OS_LISTENER_COUNT_KEY]
    if (typeof count === 'number' && count > 0) return true
    if (typeof document === 'undefined') return false
    // Fallback: NotebookApp root marker (present after first paint; polling
    // intervals of ~50–100ms also clear the useEffect registration gap).
    return Boolean(document.querySelector('[data-notebook-lock="true"]'))
}

function mergeDetail(
    detail: Record<string, unknown>,
    opts?: NotebookOsDispatchOptions
): Record<string, unknown> {
    const next: Record<string, unknown> = { ...detail }
    if (opts?.notebookId != null && next.notebookId == null) {
        next.notebookId = opts.notebookId
    }
    if (opts?.path != null && next.path == null) {
        next.path = opts.path
    }
    return next
}

function dispatchOnce(eventName: string, detail: Record<string, unknown>): void {
    window.dispatchEvent(new CustomEvent(eventName, { detail }))
}

/**
 * Dispatch a notebook OS CustomEvent, waiting briefly for NotebookApp listeners
 * to mount after `open()` / `addWindow` when needed.
 *
 * @returns `true` if the event was dispatched to a live listener; `false` if
 * the wait timed out (caller should keep fail-closed nack / timeout behavior).
 */
export function dispatchNotebookOsEvent(
    eventName: string,
    detail: Record<string, unknown> = {},
    opts?: NotebookOsDispatchOptions
): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false)

    const maxWaitMs = opts?.maxWaitMs ?? 1500
    const retryIntervalMs = opts?.retryIntervalMs ?? 75
    const payload = mergeDetail(detail, opts)

    if (isNotebookOsListenerAlive()) {
        dispatchOnce(eventName, payload)
        return Promise.resolve(true)
    }

    opts?.open?.()

    if (maxWaitMs <= 0) {
        return Promise.resolve(false)
    }

    const startedAt = Date.now()

    return new Promise((resolve) => {
        const tick = () => {
            if (isNotebookOsListenerAlive()) {
                dispatchOnce(eventName, payload)
                resolve(true)
                return
            }
            if (Date.now() - startedAt >= maxWaitMs) {
                resolve(false)
                return
            }
            window.setTimeout(tick, retryIntervalMs)
        }
        window.setTimeout(tick, retryIntervalMs)
    })
}

/** Test helper: set/clear the live-listener counter without mounting NotebookApp. */
export function setNotebookOsListenerCountForTests(count: number): void {
    if (typeof window === 'undefined') return
    ;(window as ListenerCountWindow)[WIM_NOTEBOOK_OS_LISTENER_COUNT_KEY] = count
}
