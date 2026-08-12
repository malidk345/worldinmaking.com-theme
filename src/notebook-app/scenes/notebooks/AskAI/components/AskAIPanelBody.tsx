import { useRef } from 'react'
import { LemonButton } from '~nb-lib/lemon-ui/index'
import { ChatMessageItem } from './ChatMessageItem'
import { EDITORIAL_SUGGESTIONS } from '../constants'
import type { ChatMessage, OSActionCard } from '../types'
import type { PhilosopherBot } from '~nb-lib/philosophers'

interface AskAIPanelBodyProps {
    messages: ChatMessage[]
    isGenerating: boolean
    roster: PhilosopherBot[]
    activeBot: PhilosopherBot
    hasThread: boolean
    chatEndRef: React.RefObject<HTMLDivElement | null>
    onInsert: (text: string) => void
    onExecuteOSAction: (msgId: string, action: OSActionCard) => void
    onSendPrompt: (prompt: string) => void
}

export function AskAIPanelBody({
    messages,
    isGenerating,
    roster,
    activeBot,
    hasThread,
    chatEndRef,
    onInsert,
    onExecuteOSAction,
    onSendPrompt,
}: AskAIPanelBodyProps): JSX.Element {
    return (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {/* Empty state: editorial suggestions grid */}
            {!hasThread && (
                <div className="space-y-2.5">
                    <p className="text-xs text-secondary mb-0 leading-snug">
                        Full AI Editorial Engine. Transform, format, summarize, or critique your notebook content in real-time.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {EDITORIAL_SUGGESTIONS.map((item) => {
                            const IconComp = item.icon
                            return (
                                <LemonButton
                                    key={item.label}
                                    size="xsmall"
                                    type="secondary"
                                    icon={<IconComp />}
                                    onClick={() => onSendPrompt(item.prompt)}
                                    className="justify-start text-left truncate"
                                >
                                    <span className="truncate text-xs">{item.label}</span>
                                </LemonButton>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Message thread */}
            {hasThread && (
                <div className="space-y-3">
                    {messages.map((msg) => (
                        <ChatMessageItem
                            key={msg.id}
                            msg={msg}
                            allMessages={messages}
                            roster={roster}
                            activeBot={activeBot}
                            onInsert={onInsert}
                            onExecuteOSAction={onExecuteOSAction}
                        />
                    ))}
                    <div ref={chatEndRef} />
                </div>
            )}
        </div>
    )
}
