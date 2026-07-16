"use client"

import React, { useEffect } from 'react'
import Home from 'components/craft-editor/src/pages/home'
import '../../components/editor/editor.css'

export default function WritePostPage() {
    useEffect(() => {
        document.body.classList.add('post-editor-root')
        return () => {
            document.body.classList.remove('post-editor-root')
        }
    }, [])

    return (
        <main className="h-[100dvh] w-screen overflow-hidden bg-background post-editor-root font-sans">
            <Home />
        </main>
    )
}
