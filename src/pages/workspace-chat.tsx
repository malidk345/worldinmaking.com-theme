import React, { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function WorkspaceChatPage() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to desktop and open the Claude chat panel via query flag.
        // Desktop reads ?open=chat on mount and calls setIsClaudeChatOpen(true).
        router.replace('/desktop?open=chat')
    }, [])

    return (
        <div className="flex h-screen w-full items-center justify-center bg-bg-primary text-primary font-sans text-sm">
            <div className="flex items-center gap-3">
                <div className="size-4 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
                <span>Yükleniyor...</span>
            </div>
        </div>
    )
}
