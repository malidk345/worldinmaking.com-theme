import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { fetchWorldRoom } from '../../lib/world-account'
import { PENDING_ROOM_KEY, VISITING_ROOM_KEY } from '../../lib/world-snapshot'

export default function SharedRoomPage() {
    const router = useRouter()
    const raw = router.query.token
    const token = typeof raw === 'string' ? raw : ''
    const [error, setError] = useState('')

    useEffect(() => {
        if (!router.isReady || !token) return
        let cancelled = false
        fetchWorldRoom(token)
            .then((snapshot) => {
                if (cancelled) return
                if (!snapshot) {
                    setError('This room is gone or the link is wrong.')
                    return
                }
                try {
                    sessionStorage.setItem(PENDING_ROOM_KEY, JSON.stringify(snapshot))
                    sessionStorage.setItem(VISITING_ROOM_KEY, token)
                } catch {
                    setError('Could not open this room in this browser.')
                    return
                }
                router.replace('/')
            })
            .catch(() => {
                if (!cancelled) setError('Could not load this room.')
            })
        return () => {
            cancelled = true
        }
    }, [router, token])

    return (
        <div className="flex h-dvh w-screen items-center justify-center bg-primary text-primary p-6">
            <p className="text-sm text-secondary m-0">{error || 'Opening room…'}</p>
        </div>
    )
}

SharedRoomPage.noLayout = true
