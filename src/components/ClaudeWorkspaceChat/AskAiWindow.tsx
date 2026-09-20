import React from 'react'
import { useApp, useAppWindows } from '../../context/App'
import { ASK_AI_KEY, findAskAiWindow } from '../../lib/open-ask-ai-window'
import ChatApp from './index'

/** Ask AI as window content — same chrome as every other AppWindow. */
export default function AskAiWindow(): JSX.Element {
    const { closeWindow } = useApp()
    const { windows } = useAppWindows()

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
            <ChatApp
                layout="window"
                onClose={() => {
                    const windowItem = findAskAiWindow(windows)
                    if (windowItem) closeWindow(windowItem)
                }}
            />
        </div>
    )
}

export { ASK_AI_KEY }
