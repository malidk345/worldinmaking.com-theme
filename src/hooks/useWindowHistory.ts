import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/router'
import type { AppWindow } from '../context/Window'

export function useWindowHistory(item: AppWindow) {
    const [history, setHistory] = useState<string[]>([])
    const [activeHistoryIndex, setActiveHistoryIndex] = useState(0)
    const router = useRouter()

    const canGoBack = history.length > 0 && activeHistoryIndex > 0
    const canGoForward = activeHistoryIndex < history.length - 1

    useEffect(() => {
        if (!item?.fromHistory) {
            setHistory((prev) => [...prev, item.path])
            setActiveHistoryIndex(history.length)
        }
    }, [item?.path, item?.fromHistory])

    const goBack = useCallback(() => {
        if (canGoBack) {
            setActiveHistoryIndex(activeHistoryIndex - 1)
            router.push(history[activeHistoryIndex - 1])
        }
    }, [canGoBack, activeHistoryIndex, history, router])

    const goForward = useCallback(() => {
        if (canGoForward) {
            setActiveHistoryIndex(activeHistoryIndex + 1)
            router.push(history[activeHistoryIndex + 1])
        }
    }, [canGoForward, activeHistoryIndex, history, router])

    return { history, canGoBack, canGoForward, goBack, goForward }
}
