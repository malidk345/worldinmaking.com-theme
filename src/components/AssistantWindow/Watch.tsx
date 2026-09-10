import { useEffect, useRef } from 'react'
import { requestAssistantLiveNotice } from 'lib/assistant-live'
import {
    seedAssistantNotices,
    tickLocalAssistantNotice,
    tickNotebookReadingNotice,
    readWatchMeta,
} from 'lib/assistant-notices'
import { PERSONAL_ASSISTANT_EVENT, readPersonalAssistantId } from 'lib/personal-assistant'

const NOTEBOOKS_CHANGED = 'wimNotebooksChanged'
const NOTEBOOKS_HYDRATED = 'wimNotebooksHydrated'
const LOCAL_EVERY_MS = 90_000
const LIVE_EVERY_MS = 5 * 60_000
const FIRST_LIVE_MS = 8_000
const NOTEBOOK_DEBOUNCE_MS = 22_000

export default function AssistantWatch() {
    const liveLock = useRef(false)
    const notebookTimer = useRef<number | null>(null)

    useEffect(() => {
        const seed = () => {
            const id = readPersonalAssistantId()
            if (id) seedAssistantNotices(id)
        }
        seed()
        window.addEventListener(PERSONAL_ASSISTANT_EVENT, seed)
        return () => window.removeEventListener(PERSONAL_ASSISTANT_EVENT, seed)
    }, [])

    useEffect(() => {
        const localTick = () => {
            if (document.visibilityState === 'hidden') return
            if (!readPersonalAssistantId()) return
            const meta = readWatchMeta()
            if (Date.now() - meta.lastLocalAt < LOCAL_EVERY_MS - 5_000) return
            tickLocalAssistantNotice()
        }
        const id = window.setInterval(localTick, LOCAL_EVERY_MS)
        const onFocus = () => localTick()
        window.addEventListener('focus', onFocus)
        return () => {
            window.clearInterval(id)
            window.removeEventListener('focus', onFocus)
        }
    }, [])

    useEffect(() => {
        const runLive = async () => {
            if (liveLock.current) return
            if (document.visibilityState === 'hidden') return
            const id = readPersonalAssistantId()
            if (!id) return
            const meta = readWatchMeta()
            if (Date.now() - meta.lastLiveAt < LIVE_EVERY_MS - 5_000) return
            liveLock.current = true
            try {
                await requestAssistantLiveNotice('nag')
            } finally {
                liveLock.current = false
            }
        }
        const start = window.setTimeout(() => {
            void runLive()
        }, FIRST_LIVE_MS)
        const id = window.setInterval(() => {
            void runLive()
        }, LIVE_EVERY_MS)
        return () => {
            window.clearTimeout(start)
            window.clearInterval(id)
        }
    }, [])

    useEffect(() => {
        const onNotebooks = () => {
            if (!readPersonalAssistantId()) return
            if (notebookTimer.current) window.clearTimeout(notebookTimer.current)
            notebookTimer.current = window.setTimeout(() => {
                tickNotebookReadingNotice()
            }, NOTEBOOK_DEBOUNCE_MS)
        }
        window.addEventListener(NOTEBOOKS_CHANGED, onNotebooks)
        window.addEventListener(NOTEBOOKS_HYDRATED, onNotebooks)
        return () => {
            window.removeEventListener(NOTEBOOKS_CHANGED, onNotebooks)
            window.removeEventListener(NOTEBOOKS_HYDRATED, onNotebooks)
            if (notebookTimer.current) window.clearTimeout(notebookTimer.current)
        }
    }, [])

    return null
}
