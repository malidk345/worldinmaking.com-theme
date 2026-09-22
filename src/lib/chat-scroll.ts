/**
 * WIM AI chat scroller helpers — lock a user message near the top of the
 * AppWindow chat pane while the assistant reply streams below.
 *
 * One model: pin-to-message (with small top inset) while the assistant streams.
 * Manual scroll releases the pin; stream settle clears the pin (no idle re-pin)
 * but keeps the minimum bottom spacer needed so scrollTop is not clamped into
 * older history. There is no stick-to-bottom re-arm.
 */

/** Small inset so the bubble sits under the scroller top mask, not flush to 0. */
export const CHAT_PIN_TOP_PADDING_PX = 16

/** Content-Y of `el`'s top edge relative to the scroller's scrollable content. */
export function elementOffsetInScroller(scroller: HTMLElement, el: HTMLElement): number {
    const scrollerRect = scroller.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    return scroller.scrollTop + (elRect.top - scrollerRect.top)
}

/**
 * Extra bottom spacer so `scrollTop = messageOffset - topPadding` stays reachable
 * when the reply below the user bubble is still short.
 */
export function computePinSpacerHeight(
    scrollerClientHeight: number,
    contentHeightExcludingSpacer: number,
    messageOffset: number,
    topPadding: number = CHAT_PIN_TOP_PADDING_PX
): number {
    if (scrollerClientHeight <= 0) return 0
    const targetScroll = Math.max(0, messageOffset - topPadding)
    const needed = targetScroll + scrollerClientHeight - contentHeightExcludingSpacer
    return Math.max(0, Math.ceil(needed))
}

/**
 * Minimum bottom spacer so the current `scrollTop` stays reachable after the
 * pin is released. Removing more than this clamps scrollTop downward and yanks
 * the viewport into older messages (post-#794 settle bug).
 */
export function minSpacerToPreserveScrollTop(
    scrollTop: number,
    scrollerClientHeight: number,
    contentHeightExcludingSpacer: number
): number {
    if (scrollerClientHeight <= 0) return 0
    const needed = scrollTop + scrollerClientHeight - contentHeightExcludingSpacer
    return Math.max(0, Math.ceil(needed))
}

/**
 * Align `el` near the scroller top with a small inset (no smooth / page scroll).
 * Growing content below does not need this call again if scrollTop is held;
 * call again after layout when a pin lock is active.
 */
export function scrollElementToScrollerPin(
    scroller: HTMLElement,
    el: HTMLElement,
    topPadding: number = CHAT_PIN_TOP_PADDING_PX
): void {
    const next = Math.max(0, elementOffsetInScroller(scroller, el) - topPadding)
    if (Math.abs(scroller.scrollTop - next) > 1) {
        scroller.scrollTop = next
    }
}

/** @deprecated Prefer scrollElementToScrollerPin — kept for flush-top callers. */
export function scrollElementToScrollerTop(scroller: HTMLElement, el: HTMLElement): void {
    scrollElementToScrollerPin(scroller, el, 0)
}
