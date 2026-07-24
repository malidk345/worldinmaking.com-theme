'use client'

import React from 'react'
import '@fontsource-variable/ibm-plex-sans'
import '@fontsource-variable/ibm-plex-sans/wght-italic.css'
import '@fontsource/source-code-pro'
import '../styles/global.css'
import { Provider as ToastProvider } from '../context/Toast'
import { UserProvider } from '../hooks/useUser'

// Mirror gatsby-browser.tsx wrapRootElement provider chain
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <UserProvider>{children}</UserProvider>
        </ToastProvider>
    )
}
