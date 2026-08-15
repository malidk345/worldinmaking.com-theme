import { useLayoutEffect, useRef, useState } from 'react'

/** Local observer — `use-resize-observer` is webpack-shimmed to a mock in this app. */
function useObservedWidth(ref: React.RefObject<HTMLElement | null>): number {
    const [width, setWidth] = useState(0)

    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return

        const read = () => setWidth(el.offsetWidth)
        read()

        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(read)
        observer.observe(el)
        return () => observer.disconnect()
    }, [ref])

    return width
}

/**
 * Dynamic slider positioning for horizontal single-choice components such as LemonSegmentedButton or LemonTabs.
 * @private
 */
export function useSliderPositioning<C extends HTMLElement, S extends HTMLElement>(
    currentValue: React.Key | null | undefined,
    transitionMs: number
): {
    containerRef: React.RefObject<C>
    selectionRef: React.RefObject<S>
    sliderWidth: number
    sliderOffset: number
    transitioning: boolean
} {
    const hasRenderedInitiallyRef = useRef(false)
    const containerRef = useRef<C>(null)
    const selectionRef = useRef<S>(null)
    const [[selectionWidth, selectionOffset], setSelectionWidthAndOffset] = useState<[number, number]>([0, 0])
    const [transitioning, setTransitioning] = useState(false)
    const containerWidth = useObservedWidth(containerRef)

    useLayoutEffect(() => {
        if (selectionRef.current) {
            setSelectionWidthAndOffset([selectionRef.current.offsetWidth, selectionRef.current.offsetLeft])
            if (hasRenderedInitiallyRef.current) {
                setTransitioning(true)
                const transitioningTimeout = setTimeout(() => setTransitioning(false), transitionMs)
                return () => clearTimeout(transitioningTimeout)
            }
            hasRenderedInitiallyRef.current = true
        }
    }, [currentValue, containerWidth]) // oxlint-disable-line react-hooks/exhaustive-deps

    return {
        containerRef,
        selectionRef,
        sliderWidth: selectionWidth,
        sliderOffset: selectionOffset,
        transitioning,
    }
}
