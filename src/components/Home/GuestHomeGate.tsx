import React, { useEffect, useRef } from 'react'
import { useUser } from 'hooks/useUser'
import { useAppActions, useAppWindows } from 'context/App'
import { isHomeWindowPath } from '../../lib/window-path'

function isDesktopShellPath(pathname: string): boolean {
    return pathname === '/' || pathname === '/desktop' || pathname === '/home'
}

/** Home is a guest landing window. Signed-in users keep the empty desktop. */
export default function GuestHomeGate() {
    const { user, isValidating } = useUser()
    const { windows } = useAppWindows()
    const { addWindow, closeWindow } = useAppActions()
    const openedForGuestRef = useRef(false)

    useEffect(() => {
        if (isValidating) return

        const homeWindows = windows.filter((w) => isHomeWindowPath(w.path))

        if (user) {
            openedForGuestRef.current = false
            homeWindows.forEach((w) => closeWindow(w))
            return
        }

        if (openedForGuestRef.current) return
        if (typeof window === 'undefined') return
        if (!isDesktopShellPath(window.location.pathname)) return

        openedForGuestRef.current = true
        if (homeWindows.length > 0) return
        addWindow({ path: '/home', title: 'Home' })
    }, [user, isValidating, windows, addWindow, closeWindow])

    return null
}
