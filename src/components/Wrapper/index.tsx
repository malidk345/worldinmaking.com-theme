import React from 'react'
import dynamic from 'next/dynamic'
import { useAppActions, useAppSettings, useAppWindows } from '../../context/App'
import Desktop from 'components/Desktop'
import GuestHomeGate from 'components/Home/GuestHomeGate'
import TaskBarMenu from 'components/TaskBarMenu'
import AppWindow from 'components/AppWindow'
import CookieBannerToast from 'components/CookieBanner/ToastVersion'
import AppContainer from 'components/AppContainer'
import { TooltipProvider } from 'components/RadixUI/Tooltip'

import { AnimatePresence } from 'framer-motion'

const SearchOverlay = dynamic(() => import('components/SpotlightSearch').then((module) => module.SearchOverlay), {
    ssr: false,
})
const ActiveWindowsPanel = dynamic(() => import('components/ActiveWindowsPanel'), { ssr: false })
const CommandPalette = dynamic(() => import('components/CommandPalette'), { ssr: false })
const AuthModal = dynamic(() => import('components/Auth/AuthModal'), { ssr: false })

// Isolates the `windows` subscription so that opening/closing a window only
// re-renders this list, not the whole Wrapper (and therefore not the desktop,
// taskbar, etc.).
const WindowList = React.memo(function WindowList() {
    const { windows } = useAppWindows()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div suppressHydrationWarning className="relative size-full overflow-hidden pointer-events-none" />
    }

    return (
        <div suppressHydrationWarning className="relative size-full overflow-hidden pointer-events-none">
            <AnimatePresence>
                {windows.map((item) => (
                    <AppWindow item={item} key={item.key} />
                ))}
            </AnimatePresence>
        </div>
    )
})

import { useApp } from '../../context/App'

function VisitingRoomBanner() {
    const { visitingRoomToken, exitSharedRoom } = useApp()
    if (!visitingRoomToken) return null
    return (
        <div className="pointer-events-auto absolute left-1/2 top-2 z-[80] flex max-w-[min(36rem,calc(100%-1rem))] -translate-x-1/2 flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-md border border-primary bg-primary/90 px-3 py-1.5 text-xs text-primary shadow-md backdrop-blur-sm">
            <span>Visiting a shared room — your account world is not overwritten.</span>
            <button
                type="button"
                className="font-semibold underline decoration-primary/40 underline-offset-2"
                onClick={exitSharedRoom}
            >
                Back to mine
            </button>
        </div>
    )
}

export default function Wrapper() {
    const { constraintsRef } = useAppActions()
    const { compact } = useAppSettings()
    const { isAuthModalOpen, setIsAuthModalOpen, authModalView, authModalOnSuccess } = useApp() as any

    return (
        <TooltipProvider delayDuration={300}>
            <AppContainer suppressHydrationWarning className="h-full min-h-0 flex flex-col p-2 overflow-hidden overscroll-none touch-none select-none">
                {!compact && <TaskBarMenu />}
                <div ref={constraintsRef} className={`flex-grow relative min-h-0 overflow-hidden touch-none`}>
                    <VisitingRoomBanner />
                    <Desktop />
                    <GuestHomeGate />
                    <WindowList />
                </div>
                {/*             
                {!compact && <Dock />}
                */}
                <SearchOverlay />
                <CookieBannerToast />
                <ActiveWindowsPanel />
                <CommandPalette />
                <AuthModal
                    isOpen={!!isAuthModalOpen}
                    onClose={() => setIsAuthModalOpen?.(false)}
                    initialView={authModalView || 'sign-in'}
                    onSuccess={(user) => {
                        authModalOnSuccess?.(user)
                    }}
                />
            </AppContainer>
        </TooltipProvider>
    )
}
