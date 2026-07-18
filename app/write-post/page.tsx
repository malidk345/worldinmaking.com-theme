"use client"

import React, { useEffect } from 'react'
import Home from 'components/craft-editor/src/pages/home'
import { ThemeProvider } from 'components/craft-editor/src/components/theme-provider'
import '../../components/editor/editor.css'

export default function WritePostPage() {
    useEffect(() => {
        const isDesktop = document.querySelector('[data-app="Desktop"]') !== null
        if (!isDesktop) {
            document.body.classList.add('post-editor-root')
        }
        return () => {
            document.body.classList.remove('post-editor-root')
        }
    }, [])

    return (
        <main className="size-full overflow-hidden bg-white dark:bg-black post-editor-root font-sans">
            <ThemeProvider defaultTheme="system" storageKey="craft-ui-theme">
                <Home />
            </ThemeProvider>
        </main>
    )
}
