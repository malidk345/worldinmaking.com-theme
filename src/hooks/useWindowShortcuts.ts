import { useEffect } from 'react'
import type { AppWindow } from '../context/Window'

interface UseWindowShortcutsOptions {
    item: AppWindow
    focusedWindow?: AppWindow | null
    closing: boolean
    compact: boolean
    isMobile: boolean
    expandWindow: (target?: AppWindow) => void
    handleSnapToSide: (side: 'left' | 'right', target?: AppWindow) => void
    handleClose: () => void
    setClosing: (closing: boolean) => void
    closingAllWindowsAnimation: boolean
    windowRef: React.RefObject<HTMLDivElement>
}

export function useWindowShortcuts({
    item,
    focusedWindow,
    closing,
    compact,
    isMobile,
    expandWindow,
    handleSnapToSide,
    handleClose,
    setClosing,
    closingAllWindowsAnimation,
    windowRef,
}: UseWindowShortcutsOptions) {
    useEffect(() => {
        const handleWindowClose = (event: CustomEvent) => {
            if (event.detail.windowKey === item.key) {
                handleClose()
            }
        }

        document.addEventListener('windowClose', handleWindowClose as EventListener)

        return () => {
            document.removeEventListener('windowClose', handleWindowClose as EventListener)
        }
    }, [item.key, handleClose])

    useEffect(() => {
        const shouldCloseOnEscape = item.appSettings?.closeOnEscape || item.modal
        if (!shouldCloseOnEscape || focusedWindow?.key !== item.key || closing) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return

            event.preventDefault()
            setClosing(true)
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [closing, focusedWindow?.key, item, setClosing])

    useEffect(() => {
        if (!item.modal || focusedWindow?.key !== item.key) return

        const handleFocusTrap = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return

            const element = windowRef.current
            if (!element) return

            const focusableElements = Array.from(
                element.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter(
                (el) =>
                    el.tabIndex !== -1 && !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
            )

            if (focusableElements.length === 0) {
                event.preventDefault()
                return
            }

            const firstElement = focusableElements[0]
            const lastElement = focusableElements[focusableElements.length - 1]

            if (event.shiftKey) {
                if (document.activeElement === firstElement || document.activeElement === element) {
                    lastElement.focus()
                    event.preventDefault()
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus()
                    event.preventDefault()
                }
            }
        }

        window.addEventListener('keydown', handleFocusTrap)
        return () => window.removeEventListener('keydown', handleFocusTrap)
    }, [focusedWindow?.key, item.key, item.modal, windowRef])

    useEffect(() => {
        if (closingAllWindowsAnimation && !closing) {
            setClosing(true)
        }
    }, [closingAllWindowsAnimation, closing, setClosing])

    useEffect(() => {
        if (focusedWindow !== item || compact || isMobile) return

        const handleShortcut = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase()
            const modifier = event.metaKey || event.ctrlKey

            if ((modifier && key === 'w') || (event.shiftKey && key === 'w')) {
                event.preventDefault()
                handleClose()
            } else if (event.shiftKey && event.key === 'ArrowUp') {
                event.preventDefault()
                expandWindow(item)
            } else if (event.shiftKey && event.key === 'ArrowLeft') {
                event.preventDefault()
                handleSnapToSide('left')
            } else if (event.shiftKey && event.key === 'ArrowRight') {
                event.preventDefault()
                handleSnapToSide('right')
            }
        }

        window.addEventListener('keydown', handleShortcut)
        return () => window.removeEventListener('keydown', handleShortcut)
    }, [focusedWindow, item, compact, isMobile, expandWindow, handleSnapToSide, handleClose])
}
