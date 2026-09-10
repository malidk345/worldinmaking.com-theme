import { useEffect, useRef } from 'react'
import { requestAssistantLiveNotice } from 'lib/assistant-live'
import {
    seedAssistantNotices,
    tickLocalAssistantNotice,
    tickNotebookReadingNotice,
    readWatchMeta,
    ASSISTANT_NOTICES_EVENT,
} from 'lib/assistant-notices'
import {
    PERSONAL_ASSISTANT_EVENT,
    readPersonalAssistantId,
} from 'lib/personal-assistant'
import {
    ASSISTANT_CADENCE_EVENT,
    cadenceIntervals,
    isAssistantQuiet,
    readAssistantCadence,
} from 'lib/assistant-cadence'
import { ASSISTANT_MEMORY_EVENT } from 'lib/assistant-memory'
import { setAssistantWorldForum, setAssistantWorldProfile, setAssistantWorldWindows } from 'lib/assistant-world'
import { hydrateAssistantFromRemote, scheduleAssistantPush } from 'lib/assistant-sync'
import { fetchSupabaseCommunityPosts } from 'lib/supabaseCommunity'
import { getAuthUserId } from 'lib/wim-identity'
import { useAppWindows } from '../../context/App'
import { useUser } from 'hooks/useUser'

const FIRST_LIVE_MS = 8_000
const NOTEBOOK_DEBOUNCE_MS = 22_000
const NOTEBOOKS_CHANGED = 'wimNotebooksChanged'
const NOTEBOOKS_HYDRATED = 'wimNotebooksHydrated'

export default function AssistantWatch() {
    const liveLock = useRef(false)
    const notebookTimer = useRef<number | null>(null)
    const { windows } = useAppWindows()
    const { user } = useUser()

    useEffect(() => {
        setAssistantWorldWindows(
            windows.slice(0, 12).map((w) => ({
                path: String(w.path || ''),
                title: String(w.title || w.meta?.title || w.path || ''),
            }))
        )
    }, [windows])

    useEffect(() => {
        setAssistantWorldProfile(
            user
                ? {
                      name:
                          [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || user.username,
                      username: user.username,
                      bio: user.profile?.biography || undefined,
                  }
                : null
        )
    }, [user])

    useEffect(() => {
        const refreshForum = async () => {
            const uid = getAuthUserId()
            if (!uid) {
                setAssistantWorldForum([])
                return
            }
            try {
                const posts = await fetchSupabaseCommunityPosts(undefined, undefined, { authorId: uid, limit: 8 })
                setAssistantWorldForum(
                    (posts || []).slice(0, 8).map((post) => ({ title: String(post.title || 'Untitled') }))
                )
            } catch {
                /* ignore */
            }
        }
        void refreshForum()
        const id = window.setInterval(() => void refreshForum(), 10 * 60_000)
        return () => window.clearInterval(id)
    }, [user?.id])

    useEffect(() => {
        void hydrateAssistantFromRemote()
        const seed = () => {
            const id = readPersonalAssistantId()
            if (id) seedAssistantNotices(id)
            scheduleAssistantPush()
        }
        seed()
        window.addEventListener(PERSONAL_ASSISTANT_EVENT, seed)
        window.addEventListener(ASSISTANT_NOTICES_EVENT, scheduleAssistantPush)
        window.addEventListener(ASSISTANT_CADENCE_EVENT, scheduleAssistantPush)
        window.addEventListener(ASSISTANT_MEMORY_EVENT, scheduleAssistantPush)
        return () => {
            window.removeEventListener(PERSONAL_ASSISTANT_EVENT, seed)
            window.removeEventListener(ASSISTANT_NOTICES_EVENT, scheduleAssistantPush)
            window.removeEventListener(ASSISTANT_CADENCE_EVENT, scheduleAssistantPush)
            window.removeEventListener(ASSISTANT_MEMORY_EVENT, scheduleAssistantPush)
        }
    }, [])

    useEffect(() => {
        const localTick = () => {
            if (document.visibilityState === 'hidden') return
            if (!readPersonalAssistantId()) return
            if (isAssistantQuiet()) return
            const { localMs } = cadenceIntervals(readAssistantCadence().mode)
            const meta = readWatchMeta()
            if (Date.now() - meta.lastLocalAt < localMs - 5_000) return
            tickLocalAssistantNotice()
        }
        const id = window.setInterval(localTick, 15_000)
        const onFocus = () => localTick()
        window.addEventListener('focus', onFocus)
        window.addEventListener(ASSISTANT_CADENCE_EVENT, localTick)
        return () => {
            window.clearInterval(id)
            window.removeEventListener('focus', onFocus)
            window.removeEventListener(ASSISTANT_CADENCE_EVENT, localTick)
        }
    }, [])

    useEffect(() => {
        const runLive = async () => {
            if (liveLock.current) return
            if (document.visibilityState === 'hidden') return
            const id = readPersonalAssistantId()
            if (!id) return
            if (isAssistantQuiet()) return
            const { liveMs } = cadenceIntervals(readAssistantCadence().mode)
            const meta = readWatchMeta()
            if (Date.now() - meta.lastLiveAt < liveMs - 5_000) return
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
        }, 30_000)
        return () => {
            window.clearTimeout(start)
            window.clearInterval(id)
        }
    }, [])

    useEffect(() => {
        const onNotebooks = () => {
            if (!readPersonalAssistantId()) return
            if (isAssistantQuiet()) return
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
