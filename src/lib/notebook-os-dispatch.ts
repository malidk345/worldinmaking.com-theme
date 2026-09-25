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

export type NotebookAckResult = { ok: true; notebookId?: string } | { ok: false; error: string }

export type NotebookOsAckOptions = NotebookOsDispatchOptions & {
    /** How long to wait for NotebookApp's `wimNotebookAck` after dispatch (executeOSAction parity: 5 s). */
    ackTimeoutMs?: number
}

let notebookRequestSeq = 0

/**
 * Dispatch a notebook OS event and resolve with the notebook's real confirmation
 * (`wimNotebookAck`), not just "the event was sent". The listener is registered
 * before dispatch so a synchronous ack cannot be missed.
 *
 * Matching: acks that echo our `requestId` are authoritative. Older acks without a
 * requestId fall back to executeOSAction's rule — success acks must carry the target
 * notebookId (when we have one); nacks (`ok: false`) carry no id and are accepted.
 */
export function dispatchNotebookOsEventWithAck(
    eventName: string,
    detail: Record<string, unknown> = {},
    opts: NotebookOsAckOptions = {}
): Promise<NotebookAckResult> {
    if (typeof window === 'undefined') return Promise.resolve({ ok: false, error: 'no_window' })
    notebookRequestSeq += 1
    const requestId = `nbreq-${Date.now().toString(36)}-${notebookRequestSeq}`
    const targetId = (detail.notebookId as string | undefined) || opts.notebookId
    const ackTimeoutMs = opts.ackTimeoutMs ?? 5000

    return new Promise<NotebookAckResult>((resolve) => {
        let settled = false
        let timer: ReturnType<typeof setTimeout> | undefined
        const finish = (result: NotebookAckResult) => {
            if (settled) return
            settled = true
            window.removeEventListener('wimNotebookAck', onAck)
            if (timer) clearTimeout(timer)
            resolve(result)
        }
        const onAck = (event: Event) => {
            const ack = (event as CustomEvent<{ notebookId?: string; ok?: boolean; error?: string; requestId?: string }>).detail || {}
            if (ack.requestId) {
                if (ack.requestId !== requestId) return
            } else if (ack.ok !== false && targetId && ack.notebookId && ack.notebookId !== targetId) {
                return
            }
            if (ack.ok === false) finish({ ok: false, error: String(ack.error || 'rejected') })
            else finish({ ok: true, notebookId: ack.notebookId || targetId })
        }
        window.addEventListener('wimNotebookAck', onAck)
        void dispatchNotebookOsEvent(eventName, { ...detail, requestId }, opts).then((dispatched) => {
            if (settled) return
            if (!dispatched) {
                finish({ ok: false, error: 'not_reachable' })
                return
            }
            timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), ackTimeoutMs)
        })
    })
}

/** Short, honest American-English message for a notebook nack / failure reason. */
export function notebookAckErrorMessage(error: string): string {
    switch (error) {
        case 'duplicate_source':
            return 'Already in this notebook'
        case 'selection_not_found':
        case 'span_not_found':
            return 'Could not find the selected text in the notebook'
        case 'selection_ambiguous':
            return 'The selected text appears more than once. Select a longer phrase.'
        case 'no_target':
            return 'That notebook could not be found'
        case 'empty_text':
            return 'Nothing to add'
        case 'not_reachable':
            return 'Could not open the notebook'
        case 'timeout':
            return 'The notebook did not confirm the change'
        default:
            return 'The notebook did not accept the change'
    }
}
