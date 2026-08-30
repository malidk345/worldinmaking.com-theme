import { useEffect } from 'react'
import { AppWindow as AppWindowType } from '../../context/Window'

export function useWindowShortcuts({
    item,
    focusedWindow,
    closing,
    handleClose,
    compact,
    isMobile,
    expandWindow,
    handleSnapToSide,
}: {
    item: AppWindowType
    focusedWindow: AppWindowType | null
    closing: boolean
    handleClose: () => void
    compact: boolean
    isMobile: boolean
    expandWindow: (item: AppWindowType) => void
    handleSnapToSide: (side: 'left' | 'right') => void
}) {
    useEffect(() => {
        if (!item.appSettings?.closeOnEscape || focusedWindow !== item || closing) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return

            event.preventDefault()
            handleClose()
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [closing, focusedWindow, item, handleClose])

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
