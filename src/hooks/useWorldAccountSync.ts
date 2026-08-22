import { useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { fetchUserWorld, saveUserWorld } from '../lib/world-account'
import {
    parseWorldSnapshot,
    PINNED_APPS_KEY,
    PENDING_ROOM_KEY,
    VISITING_ROOM_KEY,
    HOME_WORLD_KEY,
    WORLD_UPDATED_AT_KEY,
    type WorldSnapshot,
} from '../lib/world-snapshot'

type Args = {
    worldEpoch: string
    collectSnapshot: () => WorldSnapshot
    applySnapshot: (snapshot: WorldSnapshot, opts?: { reopenWindows?: boolean }) => void
}

function readVisiting(): boolean {
    try {
        return !!sessionStorage.getItem(VISITING_ROOM_KEY)
    } catch {
        return false
    }
}

function applyPinned(items: unknown[] | undefined) {
    if (!Array.isArray(items)) return
    try {
        localStorage.setItem(PINNED_APPS_KEY, JSON.stringify(items))
        window.dispatchEvent(new Event('wimDesktopPinnedChanged'))
    } catch {
        /* ignore */
    }
}

export function useWorldAccountSync({
    worldEpoch,
    collectSnapshot,
    applySnapshot,
}: Args) {
    const [userId, setUserId] = useState('')
    const hydratedRef = useRef(false)
    const skipNextSaveRef = useRef(false)
    const collectRef = useRef(collectSnapshot)
    const applyRef = useRef(applySnapshot)
    collectRef.current = collectSnapshot
    applyRef.current = applySnapshot

    useEffect(() => {
        if (!isSupabaseConfigured) return
        let cancelled = false
        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (!cancelled) setUserId(data.session?.user?.id || '')
            })
            .catch(() => {
                if (!cancelled) setUserId('')
            })
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id || '')
        })
        return () => {
            cancelled = true
            data.subscription.unsubscribe()
        }
    }, [])

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(PENDING_ROOM_KEY)
            if (!raw) return
            sessionStorage.removeItem(PENDING_ROOM_KEY)
            const snapshot = parseWorldSnapshot(JSON.parse(raw))
            if (!snapshot) return
            if (!sessionStorage.getItem(HOME_WORLD_KEY) && sessionStorage.getItem(VISITING_ROOM_KEY)) {
                try {
                    sessionStorage.setItem(HOME_WORLD_KEY, JSON.stringify(collectRef.current()))
                } catch {
                    /* ignore */
                }
            }
            skipNextSaveRef.current = true
            applyPinned(snapshot.pinnedItems)
            applyRef.current(snapshot, { reopenWindows: true })
        } catch {
            /* ignore */
        }
    }, [])

    useEffect(() => {
        if (!userId) {
            hydratedRef.current = false
            return
        }
        if (readVisiting()) {
            hydratedRef.current = true
            return
        }
        let cancelled = false
        fetchUserWorld()
            .then((remote) => {
                if (cancelled) return
                hydratedRef.current = true
                if (!remote) {
                    void saveUserWorld(collectRef.current())
                    return
                }
                let localUpdated = 0
                try {
                    localUpdated = Date.parse(localStorage.getItem(WORLD_UPDATED_AT_KEY) || '') || 0
                } catch {
                    localUpdated = 0
                }
                const remoteUpdated = Date.parse(remote.updatedAt) || 0
                if (remoteUpdated >= localUpdated) {
                    skipNextSaveRef.current = true
                    applyPinned(remote.snapshot.pinnedItems)
                    applyRef.current(remote.snapshot, { reopenWindows: true })
                    try {
                        localStorage.setItem(WORLD_UPDATED_AT_KEY, remote.updatedAt)
                    } catch {
                        /* ignore */
                    }
                    return
                }
                void saveUserWorld(collectRef.current())
            })
            .catch(() => {
                hydratedRef.current = true
            })
        return () => {
            cancelled = true
        }
    }, [userId])

    useEffect(() => {
        if (!userId || !hydratedRef.current || readVisiting()) return
        if (skipNextSaveRef.current) {
            skipNextSaveRef.current = false
            return
        }
        const handle = window.setTimeout(() => {
            const snapshot = collectRef.current()
            void saveUserWorld(snapshot).then((ok) => {
                if (!ok) return
                try {
                    localStorage.setItem(WORLD_UPDATED_AT_KEY, new Date().toISOString())
                } catch {
                    /* ignore */
                }
            })
        }, 1400)
        return () => window.clearTimeout(handle)
    }, [userId, worldEpoch])
}
