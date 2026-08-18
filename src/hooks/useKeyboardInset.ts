import { useEffect } from 'react'

const KEYBOARD_THRESHOLD = 80

function scrollableParent(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element.parentElement
    while (current) {
        const style = window.getComputedStyle(current)
        const canScroll = /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 1
        if (canScroll) return current
        current = current.parentElement
    }
    return (document.scrollingElement as HTMLElement | null) || document.documentElement
}

/** Nudge the scroller so the caret stays above the keyboard — no page recenter. */
function keepNotebookCaretInView(): void {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    const node =
        range.startContainer instanceof HTMLElement
            ? range.startContainer
            : range.startContainer.parentElement
    if (!node?.closest('.MarkdownNotebook, [data-markdown-notebook-editor]')) return
    const rect = range.getBoundingClientRect()
    if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0)) return
    const vv = window.visualViewport
    if (!vv) return
    const top = vv.offsetTop + 16
    const bottom = vv.offsetTop + vv.height - 28
    if (rect.top >= top && rect.bottom <= bottom) return
    const delta = rect.bottom > bottom ? rect.bottom - bottom : rect.top - top
    const scroller = scrollableParent(node)
    if (scroller) scroller.scrollTop += delta
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

/** Keeps the OS shell at visual-viewport height and exposes --keyboard-inset. */
export function useKeyboardInset(): void {
    useEffect(() => {
        const root = document.documentElement

        const apply = (keepCaret = false) => {
            const vv = window.visualViewport
            const layoutH = window.innerHeight
            const visibleH = vv?.height ?? layoutH
            const offsetTop = vv?.offsetTop ?? 0
            const inset = Math.max(0, Math.round(layoutH - visibleH - offsetTop))
            const open = inset > KEYBOARD_THRESHOLD

            root.style.setProperty('--keyboard-inset', `${open ? inset : 0}px`)
            root.style.setProperty('--vv-height', `${Math.round(visibleH)}px`)

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
            if (el.closest('[data-writing-dock], .keyboard-lift, .MarkdownNotebook, [data-markdown-notebook-editor]')) {
                return
            }
            window.setTimeout(() => {
                const vv = window.visualViewport
                if (vv) {
                    const rect = el.getBoundingClientRect()
                    const top = vv.offsetTop + 12
                    const bottom = vv.offsetTop + vv.height - 12
                    if (rect.top >= top && rect.bottom <= bottom) return
                }
                el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
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
            root.removeAttribute('data-keyboard')
            root.removeAttribute('data-keyboard-surface')
        }
    }, [])
}

export function KeyboardInsetRoot(): null {
    useKeyboardInset()
    return null
}
