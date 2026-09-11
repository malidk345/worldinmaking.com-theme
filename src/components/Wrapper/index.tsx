import React from 'react'
import { useAppActions, useAppSettings, useAppWindows } from '../../context/App'
import Desktop from 'components/Desktop'
import TaskBarMenu from 'components/TaskBarMenu'
import AppWindow from 'components/AppWindow'
import CookieBannerToast from 'components/CookieBanner/ToastVersion'
import { SearchOverlay } from 'components/SearchUI'
import { ChatOverlay } from 'hooks/useChat'
import AppContainer from 'components/AppContainer'
import { TooltipProvider } from 'components/RadixUI/Tooltip'

import ActiveWindowsPanel from 'components/ActiveWindowsPanel'

import { AnimatePresence } from 'framer-motion'

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

import CommandPalette from 'components/CommandPalette'
import FooterBar from 'components/OSChrome/FooterBar'
import AuthModal from 'components/Auth/AuthModal'
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
