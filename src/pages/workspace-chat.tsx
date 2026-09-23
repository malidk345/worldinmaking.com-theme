import React from 'react'
import dynamic from 'next/dynamic'
import { IconSpinner } from '@posthog/icons'

const AskAiWindow = dynamic(() => import('../components/ClaudeWorkspaceChat/AskAiWindow'), {
    ssr: false,
    loading: () => (
        <div className="flex h-screen w-screen items-center justify-center">
            <IconSpinner className="size-5 animate-spin text-primary" />
        </div>
    ),
})

export default function WorkspaceChatPage() {
    return <AskAiWindow />
}

