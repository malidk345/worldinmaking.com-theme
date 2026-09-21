/**
 * WIM AI chat scroller helpers — pin a message to the top of the AppWindow
 * chat pane without forcing stick-to-bottom.
 */

/** Content-Y of `el`'s top edge relative to the scroller's scrollable content. */
export function elementOffsetInScroller(scroller: HTMLElement, el: HTMLElement): number {
    const scrollerRect = scroller.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    return scroller.scrollTop + (elRect.top - scrollerRect.top)
}

/**
 * Extra bottom spacer so `scrollTop = messageOffset` stays reachable when the
 * reply below the user bubble is still short.
 */
export function computePinSpacerHeight(
    scrollerClientHeight: number,
    contentHeightExcludingSpacer: number,
    messageOffset: number
): number {
    if (scrollerClientHeight <= 0) return 0
    const needed = messageOffset + scrollerClientHeight - contentHeightExcludingSpacer
    return Math.max(0, Math.ceil(needed))
}

/** Align `el`'s top with the scroller viewport top (no smooth / page scroll). */
export function scrollElementToScrollerTop(scroller: HTMLElement, el: HTMLElement): void {
    const next = Math.max(0, elementOffsetInScroller(scroller, el))
    if (Math.abs(scroller.scrollTop - next) > 1) {
        scroller.scrollTop = next
    }
}
