import React, { useCallback, useEffect, useRef, useState } from 'react'

interface HorizontalScrollFadeState {
    /** Attach to the horizontally scrollable element. */
    ref: React.MutableRefObject<HTMLDivElement | null>
    /** True when there is hidden content to the left (i.e. scrolled away from the start). */
    showStart: boolean
    /** True when there is hidden content to the right (i.e. more to scroll). */
    showEnd: boolean
    /** Manually re-measure – useful after content changes. */
    update: () => void
}

/**
 * Tracks horizontal overflow + scroll position of an element so callers can
 * render edge fades that hint at scrollable content. Fades are only reported
 * when the element actually overflows, and hide once the corresponding edge is
 * reached. Pass `enabled={false}` to skip all listeners (e.g. full-width tables
 * that never scroll horizontally).
 */
export function useHorizontalScrollFade(enabled = true): HorizontalScrollFadeState {
    const ref = useRef<HTMLDivElement | null>(null)
    const [showStart, setShowStart] = useState(false)
    const [showEnd, setShowEnd] = useState(false)

    const update = useCallback(() => {
        const el = ref.current
        if (!el) return
        const { scrollLeft, scrollWidth, clientWidth } = el
        const maxScroll = scrollWidth - clientWidth
        // Small tolerance to avoid a lingering fade caused by sub-pixel rounding.
        const nextStart = scrollLeft > 1
        const nextEnd = scrollLeft < maxScroll - 1
        setShowStart((prev) => (prev !== nextStart ? nextStart : prev))
        setShowEnd((prev) => (prev !== nextEnd ? nextEnd : prev))
    }, [])

    useEffect(() => {
        const el = ref.current
        if (!enabled || !el) {
            setShowStart(false)
            setShowEnd(false)
            return
        }

        update()
        el.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)

        // Re-measure when the viewport or its content changes size.
        let resizeObserver: ResizeObserver | undefined
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(update)
            resizeObserver.observe(el)
            if (el.firstElementChild) {
                resizeObserver.observe(el.firstElementChild)
            }
        }

        return () => {
            el.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
            resizeObserver?.disconnect()
        }
    }, [enabled, update])

    return { ref, showStart, showEnd, update }
}

interface HorizontalScrollFadesProps {
    showStart: boolean
    showEnd: boolean
    /** Width of each fade, as a Tailwind width utility. */
    width?: string
}

/**
 * Thin inset edge so a horizontally scrollable pane reads as recessed,
 * not as a white wash. Render inside a `relative` container.
 */
export function HorizontalScrollFades({ showStart, showEnd, width = 'w-4' }: HorizontalScrollFadesProps): JSX.Element {
    return (
        <div aria-hidden className="pointer-events-none">
            <div
                className={`scrollarea-fade-x absolute top-0 bottom-0 left-0 ${width} bg-gradient-to-r from-black/[0.12] dark:from-black/35 to-transparent transition-opacity duration-150 ${
                    showStart ? 'opacity-100' : 'opacity-0'
                }`}
            />
            <div
                className={`scrollarea-fade-x absolute top-0 bottom-0 right-0 ${width} bg-gradient-to-l from-black/[0.12] dark:from-black/35 to-transparent transition-opacity duration-150 ${
                    showEnd ? 'opacity-100' : 'opacity-0'
                }`}
            />
        </div>
    )
}
