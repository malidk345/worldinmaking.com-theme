import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../../../../context/App'

export interface UseAskAIPanelReturn {
    isOpen: boolean
    setIsOpen: (v: boolean) => void
    panelRef: React.RefObject<HTMLDivElement | null>
    panelStyle: React.CSSProperties | undefined
    abortControllerRef: React.RefObject<AbortController | null>
}

export function useAskAIPanel(abortControllerRef: React.RefObject<AbortController | null>): UseAskAIPanelReturn {
    const [isOpen, setIsOpen] = useState(false)
    const panelRef = useRef<HTMLDivElement | null>(null)

    const app = useApp()
    const taskbarRef = app?.taskbarRef
    const taskbarRect = taskbarRef?.current?.getBoundingClientRect()
    const padding = taskbarRect?.left ?? 8

    const panelStyle: React.CSSProperties | undefined =
        typeof window === 'undefined'
            ? undefined
            : {
                  top: padding,
                  right: padding,
                  height: window.innerHeight - padding - (taskbarRect?.top ?? padding),
              }

    // Click-outside & Escape key handler
    useEffect(() => {
        if (!isOpen) {
            abortControllerRef.current?.abort()
            return
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                const target = event.target as HTMLElement
                if (
                    target.closest?.('[data-radix-popper-content-wrapper]') ||
                    target.closest?.('[role="menu"]') ||
                    target.closest?.('[role="listbox"]') ||
                    target.closest?.('[data-lemon-popover]') ||
                    target.closest?.('.LemonMenu') ||
                    target.closest?.('.LemonSelect') ||
                    target.closest?.('.LemonSelect__dropdown') ||
                    target.closest?.('.LemonDropdown__overlay') ||
                    target.closest?.('.Popover') ||
                    target.closest?.('.LemonButton')
                ) {
                    return
                }
                setIsOpen(false)
            }
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false)
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
            abortControllerRef.current?.abort()
        }
    }, [isOpen, abortControllerRef])

    return { isOpen, setIsOpen, panelRef, panelStyle, abortControllerRef }
}
