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
        if (!item.appSettings?.closeOnEscape || focusedWindow !== item || closing) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return

            event.preventDefault()
            setClosing(true)
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [closing, focusedWindow, item, setClosing])

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
