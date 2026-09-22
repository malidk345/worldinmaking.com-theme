export interface ViewportMetrics {
    width: number
    height: number
}

/** Layout viewport only. Do not use visualViewport — the keyboard must not resize windows. */
export const getViewportMetrics = (): ViewportMetrics => {
    if (typeof window === 'undefined') return { width: 0, height: 0 }

    return {
        width: window.innerWidth,
        height: window.innerHeight,
    }
}

export type ViewportResizeIgnoreOpts = {
    /** html[data-keyboard=open] from useKeyboardInset */
    keyboardOpen?: boolean
    /** An editable field currently has focus */
    editing?: boolean
    /** Narrow / touch shell — height-only chrome changes are common */
    isMobile?: boolean
}

/**
 * Soft keyboard (esp. Android) and mobile browser chrome (URL bar) change
 * `window.innerHeight` and fire `window.resize` without a width change.
 * Resizing/repositioning AppWindows on those events yanks conversation
 * layout (feels like the chat "jumps upward" / "re-centers") even when
 * chat `scrollTop` is untouched — keyboard overlay + writing-dock inset
 * already keep the composer visible.
 *
 * Orientation / real layout changes alter width and must still apply.
 */
export function shouldIgnoreViewportResizeForWindows(
    prev: ViewportMetrics,
    next: ViewportMetrics,
    opts: ViewportResizeIgnoreOpts = {}
): boolean {
    const widthDelta = Math.abs(prev.width - next.width)
    if (widthDelta > 1) return false

    const heightDelta = Math.abs(prev.height - next.height)
    if (heightDelta < 1) return true

    if (opts.keyboardOpen || opts.editing) return true

    const mobile = opts.isMobile ?? next.width < 768
    if (mobile) return true

    return false
}

export function isEditableFocusTarget(target: EventTarget | null): boolean {
    if (!target || typeof HTMLElement === 'undefined') return false
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (tag === 'INPUT') {
        const type = (target as HTMLInputElement).type
        return !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'color', 'hidden'].includes(type)
    }
    return target.isContentEditable
}
