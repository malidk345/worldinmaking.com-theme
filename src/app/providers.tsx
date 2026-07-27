'use client'

import React, { Suspense } from 'react'
import '@fontsource-variable/ibm-plex-sans'
import '@fontsource-variable/ibm-plex-sans/wght-italic.css'
import '@fontsource/source-code-pro'
import '../styles/global.css'
import { Provider as ToastProvider } from '../context/Toast'
import { Provider as AppProvider } from '../context/App'
import { UserProvider } from '../hooks/useUser'
import { TooltipProvider } from '../components/RadixUI/Tooltip'
import { usePathname, useSearchParams } from 'next/navigation'
import Wrapper from '../components/Wrapper'

function AppProviderWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const location = {
        pathname,
        search: searchParams.toString() ? `?${searchParams.toString()}` : '',
        hash: '',
    }

    return (
        <AppProvider element={children as any} location={location as any}>
            <Wrapper />
        </AppProvider>
    )
}

// Mirror gatsby-browser.tsx wrapRootElement provider chain
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider delayDuration={0}>
            <ToastProvider>
                <UserProvider>
                    <Suspense fallback={null}>
                        <AppProviderWrapper>{children}</AppProviderWrapper>
                    </Suspense>
                </UserProvider>
            </ToastProvider>
        </TooltipProvider>
    )
}