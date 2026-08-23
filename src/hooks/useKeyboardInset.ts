import { useEffect } from 'react'

const KEYBOARD_THRESHOLD = 80
const PADDED_ATTR = 'data-keyboard-padded'
const FRAME_ATTR = 'data-keyboard-frame'
const WINDOW_CONTENT_ATTR = 'data-window-content'
const WRITING_DOCK = '[data-writing-dock], .keyboard-lift'
const NOTEBOOK_EDITOR = '.MarkdownNotebook, [data-markdown-notebook-editor]'

export function measureKeyboardOverlay(
    layoutHeight: number,
    visualHeight: number,
    offsetTop: number,
    threshold = KEYBOARD_THRESHOLD
): { inset: number; pan: number; open: boolean } {
    const shrink = Math.max(0, Math.round(layoutHeight - visualHeight))
    const pan = Math.max(0, Math.round(offsetTop))
    const open = shrink > threshold || pan > threshold
    return { inset: open ? Math.max(shrink, pan) : 0, pan: open ? pan : 0, open }
}

/** Layout-viewport Y of the last pixel still above the overlay keyboard. */
export function overlaySafeBottom(layoutHeight: number, inset: number, gutter = 12): number {
    return Math.max(48, Math.round(layoutHeight - Math.max(0, inset) - gutter))
}

/** How far to scroll so `rect` sits in the overlay-safe band. 0 = already visible. */
export function keyboardRevealDelta(
    rect: { top: number; bottom: number },
    safeTop: number,
    safeBottom: number
): number {
    if (rect.top >= safeTop && rect.bottom <= safeBottom) return 0
    if (rect.bottom > safeBottom) return rect.bottom - safeBottom
    return rect.top - safeTop
}

/** Pad a frame only when the keyboard actually covers it and the frame is tall enough. */
export function shouldPadWritingFrame(
    frame: { height: number; bottom: number },
    layoutHeight: number,
    inset: number
): boolean {
    if (inset < KEYBOARD_THRESHOLD) return false
    if (frame.height < inset + 96) return false
    return frame.bottom > layoutHeight - inset + 8
}

function isScroller(element: HTMLElement): boolean {
    if (element.hasAttribute('data-radix-scroll-area-viewport')) return true
    if (element.classList.contains('app-scroll-viewport')) return true
    const overflowY = window.getComputedStyle(element).overflowY
    return /(auto|scroll|overlay)/.test(overflowY)
}

function scrollableParent(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element.parentElement
    while (current && current !== document.documentElement && current !== document.body) {
        if (isScroller(current)) return current
        current = current.parentElement
    }
    return null
}

function pickWritingFrame(element: HTMLElement, inset: number): HTMLElement | null {
    const layoutHeight = window.innerHeight
    const seen = new Set<HTMLElement>()
    const candidates: HTMLElement[] = []
    const push = (node: HTMLElement | null) => {
        if (!node || seen.has(node)) return
        seen.add(node)
        candidates.push(node)
    }
    push(element.closest(`[${FRAME_ATTR}]`))
    push(element.closest(`[${WINDOW_CONTENT_ATTR}]`))
    push(element.closest('[data-app="AppWindow"]'))
    push(scrollableParent(element))

    for (const frame of candidates) {
        if (shouldPadWritingFrame(frame.getBoundingClientRect(), layoutHeight, inset)) return frame
    }
    return null
}

function clearWritingPad(): void {
    document.querySelectorAll(`[${PADDED_ATTR}]`).forEach((node) => {
        node.removeAttribute(PADDED_ATTR)
    })
}

function padWritingFrame(frame: HTMLElement | null): void {
    clearWritingPad()
    if (frame) frame.setAttribute(PADDED_ATTR, '')
}

/** Scroll an inner pane so `rect` stays above the overlay keyboard. Never pan the page. */
function scrollRectIntoOverlay(rect: DOMRect, node: HTMLElement, inset: number, bottomGutter = 16): void {
    if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0)) return
    const delta = keyboardRevealDelta(rect, 12, overlaySafeBottom(window.innerHeight, inset, bottomGutter))
    if (delta === 0) return
    const scroller = scrollableParent(node)
    if (scroller) {
        scroller.scrollTop += delta
        return
    }
    node.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function keepNotebookCaretInView(inset: number): void {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    const node =
        range.startContainer instanceof HTMLElement
            ? range.startContainer
            : range.startContainer.parentElement
    if (!node?.closest(NOTEBOOK_EDITOR)) return
    scrollRectIntoOverlay(range.getBoundingClientRect(), node, inset, 28)
}

function writingSurface(element: HTMLElement): HTMLElement {
    return (element.closest('[data-writing-surface]') as HTMLElement) || element
}

function revealWritingSurface(element: HTMLElement, inset: number): void {
    if (element.closest(WRITING_DOCK)) {
        if (element.closest(NOTEBOOK_EDITOR)) keepNotebookCaretInView(inset)
        return
    }
    const surface = writingSurface(element)
    scrollRectIntoOverlay(surface.getBoundingClientRect(), surface, inset, 12)
}

function isEditableTarget(target: EventTarget | null): target is HTMLElement {
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (tag === 'INPUT') {
        const type = (target as HTMLInputElement).type
        return !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'color', 'hidden'].includes(type)
    }
    return target.isContentEditable
}

function resetVisualPan(vv: VisualViewport | null | undefined): void {
    try {
        vv?.scrollTo(0, 0)
    } catch {
        /* older Safari */
    }
    if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0)
    }
}

/** Overlay the keyboard. Keep the OS shell at layout size — no zoom, no window jump. */
export function useKeyboardInset(): void {
    useEffect(() => {
        const root = document.documentElement

        const apply = (keepCaret = false) => {
            const vv = window.visualViewport
            resetVisualPan(vv)
            const layoutH = window.innerHeight
            const visibleH = vv?.height ?? layoutH
            const offsetTop = vv?.offsetTop ?? 0
            const { inset, pan, open } = measureKeyboardOverlay(layoutH, visibleH, offsetTop)

            root.style.setProperty('--keyboard-inset', `${inset}px`)
            root.style.setProperty('--vv-height', `${Math.round(visibleH)}px`)
            root.style.setProperty('--vv-offset-top', `${pan}px`)
            root.style.setProperty('--app-shell-height', `${layoutH}px`)

            if (open) root.setAttribute('data-keyboard', 'open')
            else root.removeAttribute('data-keyboard')

            const focused = document.activeElement
            const active = isEditableTarget(focused) ? focused : null
            const inNotebook = Boolean(active?.closest(NOTEBOOK_EDITOR))
            const inDock = Boolean(active?.closest(WRITING_DOCK))

            if (inNotebook) root.setAttribute('data-keyboard-surface', 'notebook')
            else if (active && open) root.setAttribute('data-keyboard-surface', 'write')
            else root.removeAttribute('data-keyboard-surface')

            if (open && active && !inDock) {
                const frame = pickWritingFrame(active, inset)
                if (frame) padWritingFrame(frame)
                else clearWritingPad()
            } else {
                clearWritingPad()
            }

            if (keepCaret && open && active) {
                const field = active
                requestAnimationFrame(() => revealWritingSurface(field, inset))
            }
        }

        const timers: number[] = []
        const onFocusIn = (event: FocusEvent) => {
            if (!isEditableTarget(event.target)) return
            timers.push(window.setTimeout(() => apply(true), 50))
            timers.push(window.setTimeout(() => apply(true), 300))
        }
        const onFocusOut = () => {
            timers.push(window.setTimeout(() => apply(false), 0))
        }
        let selectionRaf = 0
        const onSelectionChange = () => {
            if (!root.hasAttribute('data-keyboard')) return
            if (selectionRaf) return
            selectionRaf = requestAnimationFrame(() => {
                selectionRaf = 0
                const active = document.activeElement
                if (!isEditableTarget(active) || !active.isContentEditable) return
                const inset = Number.parseFloat(root.style.getPropertyValue('--keyboard-inset')) || 0
                revealWritingSurface(active, inset)
            })
        }

        const applyVars = () => apply(false)
        const applyAndKeepCaret = () => apply(true)
        apply(false)
        window.visualViewport?.addEventListener('resize', applyAndKeepCaret)
        window.visualViewport?.addEventListener('scroll', applyVars)
        window.addEventListener('resize', applyAndKeepCaret)
        document.addEventListener('focusin', onFocusIn)
        document.addEventListener('focusout', onFocusOut)
        document.addEventListener('selectionchange', onSelectionChange)

        return () => {
            timers.forEach((id) => window.clearTimeout(id))
            if (selectionRaf) cancelAnimationFrame(selectionRaf)
            window.visualViewport?.removeEventListener('resize', applyAndKeepCaret)
            window.visualViewport?.removeEventListener('scroll', applyVars)
            window.removeEventListener('resize', applyAndKeepCaret)
            document.removeEventListener('focusin', onFocusIn)
            document.removeEventListener('focusout', onFocusOut)
            document.removeEventListener('selectionchange', onSelectionChange)
            clearWritingPad()
            root.style.removeProperty('--keyboard-inset')
            root.style.removeProperty('--vv-height')
            root.style.removeProperty('--vv-offset-top')
            root.style.removeProperty('--app-shell-height')
            root.removeAttribute('data-keyboard')
            root.removeAttribute('data-keyboard-surface')
        }
    }, [])
}

export function KeyboardInsetRoot(): null {
    useKeyboardInset()
    return null
}
