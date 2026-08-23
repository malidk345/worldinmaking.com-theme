import { useEffect } from 'react'

const KEYBOARD_THRESHOLD = 80

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

function scrollableParent(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element.parentElement
    while (current && current !== document.documentElement && current !== document.body) {
        const style = window.getComputedStyle(current)
        const canScroll = /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 1
        if (canScroll) return current
        current = current.parentElement
    }
    return null
}

/** Scroll an inner pane so `rect` stays in the visual viewport. Never pan the page. */
function scrollRectIntoVisualViewport(rect: DOMRect, node: HTMLElement, bottomGutter = 16): void {
    const vv = window.visualViewport
    if (!vv) return
    if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0)) return
    const top = 12
    const bottom = vv.height - bottomGutter
    if (rect.top >= top && rect.bottom <= bottom) return
    const delta = rect.bottom > bottom ? rect.bottom - bottom : rect.top - top
    const scroller = scrollableParent(node)
    if (scroller) scroller.scrollTop += delta
}

function keepNotebookCaretInView(): void {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    const node =
        range.startContainer instanceof HTMLElement
            ? range.startContainer
            : range.startContainer.parentElement
    if (!node?.closest('.MarkdownNotebook, [data-markdown-notebook-editor]')) return
    scrollRectIntoVisualViewport(range.getBoundingClientRect(), node, 28)
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

            const active = document.activeElement
            const inNotebook =
                active instanceof HTMLElement &&
                Boolean(active.closest('.MarkdownNotebook, [data-markdown-notebook-editor]'))
            if (inNotebook) {
                root.setAttribute('data-keyboard-surface', 'notebook')
                if (keepCaret && open) keepNotebookCaretInView()
            } else {
                root.removeAttribute('data-keyboard-surface')
            }
        }

        const onFocusIn = (event: FocusEvent) => {
            if (!isEditableTarget(event.target)) return
            const el = event.target
            window.setTimeout(() => {
                apply(true)
                if (el.closest('[data-writing-dock], .keyboard-lift')) return
                if (el.closest('.MarkdownNotebook, [data-markdown-notebook-editor]')) return
                scrollRectIntoVisualViewport(el.getBoundingClientRect(), el, 16)
            }, 280)
        }

        const applyVars = () => apply(false)
        const applyAndKeepCaret = () => apply(true)
        apply(false)
        window.visualViewport?.addEventListener('resize', applyAndKeepCaret)
        window.visualViewport?.addEventListener('scroll', applyVars)
        window.addEventListener('resize', applyAndKeepCaret)
        document.addEventListener('focusin', onFocusIn)

        return () => {
            window.visualViewport?.removeEventListener('resize', applyAndKeepCaret)
            window.visualViewport?.removeEventListener('scroll', applyVars)
            window.removeEventListener('resize', applyAndKeepCaret)
            document.removeEventListener('focusin', onFocusIn)
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
