import { useEffect, useRef } from 'react'
import { requestAssistantLiveNotice } from 'lib/assistant-live'
import {
    seedAssistantNotices,
    seedAssistantInviteNotice,
    notebooksDigestKey,
    writeWatchMeta,
    ASSISTANT_NOTICES_EVENT,
} from 'lib/assistant-notices'
import {
    PERSONAL_ASSISTANT_EVENT,
    adoptWimAiDefaultIfNeeded,
    readPersonalAssistantId,
} from 'lib/personal-assistant'
import { isAssistantQuiet } from 'lib/assistant-cadence'
import { ASSISTANT_MEMORY_EVENT } from 'lib/assistant-memory'
import { setAssistantWorldForum, setAssistantWorldProfile, setAssistantWorldWindows } from 'lib/assistant-world'
import { hydrateAssistantFromRemote, scheduleAssistantPush } from 'lib/assistant-sync'
import { fetchSupabaseCommunityPosts } from 'lib/supabaseCommunity'
import { getAuthUserId } from 'lib/wim-identity'
import { useAppWindows } from '../../context/App'
import { useUser } from 'hooks/useUser'

const NOTEBOOK_DEBOUNCE_MS = 90_000
const NOTEBOOKS_CHANGED = 'wimNotebooksChanged'
const NOTEBOOKS_HYDRATED = 'wimNotebooksHydrated'

export default function AssistantWatch() {
    const notebookTimer = useRef<number | null>(null)
    const { windows } = useAppWindows()
    const { user } = useUser()
    const signedIn = Boolean(user)

    useEffect(() => {
        if (!signedIn) return
        setAssistantWorldWindows(
            windows.slice(0, 12).map((w) => ({
                path: String(w.path || ''),
                title: String(w.title || w.meta?.title || w.path || ''),
            }))
        )
    }, [windows, signedIn])

    useEffect(() => {
        if (!signedIn) {
            setAssistantWorldProfile(null)
            return
        }
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
    }, [user, signedIn])

    useEffect(() => {
        if (!signedIn) {
            setAssistantWorldForum([])
            return
        }
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
    }, [user?.id, signedIn])

    useEffect(() => {
        if (!signedIn) return
        void hydrateAssistantFromRemote()
        const seed = () => {
            const adopted = adoptWimAiDefaultIfNeeded()
            const id = adopted || readPersonalAssistantId()
            if (id) seedAssistantNotices(id)
            else seedAssistantInviteNotice()
            scheduleAssistantPush()
        }
        seed()
        window.addEventListener(PERSONAL_ASSISTANT_EVENT, seed)
        window.addEventListener(ASSISTANT_NOTICES_EVENT, scheduleAssistantPush)
        window.addEventListener(ASSISTANT_MEMORY_EVENT, scheduleAssistantPush)
        return () => {
            window.removeEventListener(PERSONAL_ASSISTANT_EVENT, seed)
            window.removeEventListener(ASSISTANT_NOTICES_EVENT, scheduleAssistantPush)
            window.removeEventListener(ASSISTANT_MEMORY_EVENT, scheduleAssistantPush)
        }
    }, [signedIn])

    useEffect(() => {
        if (!signedIn) return
        const onHydrated = () => {
            writeWatchMeta({ lastDigest: notebooksDigestKey() })
        }
        const onChanged = () => {
            if (!readPersonalAssistantId()) return
            if (isAssistantQuiet()) return
            if (notebookTimer.current) window.clearTimeout(notebookTimer.current)
            notebookTimer.current = window.setTimeout(() => {
                void requestAssistantLiveNotice('nag')
            }, NOTEBOOK_DEBOUNCE_MS)
        }
        window.addEventListener(NOTEBOOKS_HYDRATED, onHydrated)
        window.addEventListener(NOTEBOOKS_CHANGED, onChanged)
        return () => {
            window.removeEventListener(NOTEBOOKS_HYDRATED, onHydrated)
            window.removeEventListener(NOTEBOOKS_CHANGED, onChanged)
            if (notebookTimer.current) window.clearTimeout(notebookTimer.current)
        }
    }, [signedIn])

    return null
}