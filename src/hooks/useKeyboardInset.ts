import { useEffect } from 'react'

const KEYBOARD_THRESHOLD = 80

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

        const apply = () => {
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
        }

        const onFocusIn = (event: FocusEvent) => {
            if (!isEditableTarget(event.target)) return
            const el = event.target
            if (el.closest('[data-writing-dock], .keyboard-lift')) return
            window.setTimeout(() => {
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
            }, 280)
        }

        apply()
        window.visualViewport?.addEventListener('resize', apply)
        window.visualViewport?.addEventListener('scroll', apply)
        window.addEventListener('resize', apply)
        document.addEventListener('focusin', onFocusIn)

        return () => {
            window.visualViewport?.removeEventListener('resize', apply)
            window.visualViewport?.removeEventListener('scroll', apply)
            window.removeEventListener('resize', apply)
            document.removeEventListener('focusin', onFocusIn)
            root.style.removeProperty('--keyboard-inset')
            root.style.removeProperty('--vv-height')
            root.removeAttribute('data-keyboard')
        }
    }, [])
}

export function KeyboardInsetRoot(): null {
    useKeyboardInset()
    return null
}
