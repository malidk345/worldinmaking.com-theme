/**
 * Coalesce bursty callbacks into at most one call per animation frame.
 *
 * Deferring a ResizeObserver callback out of the observer's own delivery is what
 * stops the browser from raising "ResizeObserver loop completed with undelivered
 * notifications" — the callback no longer writes layout or React state while the
 * observer is still delivering. `schedule` is safe to pass straight to
 * `new ResizeObserver(...)`; call `cancel` on cleanup to drop a pending frame.
 */
export function coalesceToNextFrame(fn: () => void): { schedule: () => void; cancel: () => void } {
    let id = 0
    return {
        schedule() {
            if (id) return
            id = requestAnimationFrame(() => {
                id = 0
                fn()
            })
        },
        cancel() {
            if (id) cancelAnimationFrame(id)
            id = 0
        },
    }
}
