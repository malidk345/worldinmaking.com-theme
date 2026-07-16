"use client"

import React from 'react'
import Home from 'components/craft-editor/src/pages/home'
import '../../components/editor/editor.css'

export default function WritePostPage() {
    return (
        <main className="h-[100dvh] w-screen overflow-hidden bg-background post-editor-root font-sans">
            <Home />
        </main>
    )
}
