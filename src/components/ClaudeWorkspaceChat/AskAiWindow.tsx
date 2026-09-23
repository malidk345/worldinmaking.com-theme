import React from 'react'
import { useAppActions } from '../../context/App'
import { ASK_AI_KEY, findAskAiWindow } from '../../lib/open-ask-ai-window'
import ChatApp from './index'

/** Ask AI as window content — same chrome as every other AppWindow. */
export default function AskAiWindow(): JSX.Element {
    const { closeWindow, windowsRef } = useAppActions()

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
            <ChatApp
                layout="window"
                onClose={() => {
                    const windowItem = findAskAiWindow(windowsRef.current)
                    if (windowItem) closeWindow(windowItem)
                }}
            />
        </div>
    )
}

export { ASK_AI_KEY }
