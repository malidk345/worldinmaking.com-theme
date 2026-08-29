import React from 'react'
import dynamic from 'next/dynamic'

const AskAiWindow = dynamic(() => import('../components/ClaudeWorkspaceChat/AskAiWindow'), { ssr: false })

export default function WorkspaceChatPage() {
    return <AskAiWindow />
}

