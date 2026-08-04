import React from 'react'
import dynamic from 'next/dynamic'
import { useAppActions, useAppSettings, useAppWindows } from '../../context/App'
import Desktop from 'components/Desktop'
import TaskBarMenu from 'components/TaskBarMenu'
import AppWindow from 'components/AppWindow'
import CookieBannerToast from 'components/CookieBanner/ToastVersion'
import { ChatOverlay } from 'hooks/useChat'
import AppContainer from 'components/AppContainer'
import { TooltipProvider } from 'components/RadixUI/Tooltip'

import { AnimatePresence } from 'framer-motion'

const SearchOverlay = dynamic(() => import('components/SearchUI').then((module) => module.SearchOverlay), {
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

import FooterBar from 'components/OSChrome/FooterBar'
import { useApp } from '../../context/App'

export default function Wrapper() {
    const { constraintsRef } = useAppActions()
    const { compact } = useAppSettings()
    const { isAuthModalOpen, setIsAuthModalOpen, authModalView } = useApp()

    return (
        <TooltipProvider delayDuration={300}>
            <AppContainer suppressHydrationWarning className="h-dvh flex flex-col p-2 overflow-hidden touch-none select-none">
                {!compact && <TaskBarMenu />}
                <div ref={constraintsRef} className={`flex-grow relative min-h-0 overflow-hidden touch-none`}>
                    <Desktop />
                    <WindowList />
                </div>
                {/*             
                {!compact && <Dock />}
                */}
                <SearchOverlay />
                <ChatOverlay />
                <CookieBannerToast />
                <ActiveWindowsPanel />
                <FooterBar />
                <CommandPalette />
                <AuthModal
                    isOpen={!!isAuthModalOpen}
                    onClose={() => setIsAuthModalOpen?.(false)}
                    initialView={authModalView || 'sign-in'}
                />
            </AppContainer>
        </TooltipProvider>
    )
}
