import { LemonButton, ProfilePicture } from '~nb-lib/lemon-ui/index'
import { IconTable, IconPlus } from '@posthog/icons'
import { getPhilosopherBot, philosopherAsUser, type PhilosopherBot } from '~nb-lib/philosophers'
import { ReasoningAnswer } from '../../ReasoningAnswer'
import { MarkdownRenderer } from './MarkdownRenderer'
import { OSActionCard } from './OSActionCard'
import { shouldShowInsertButton } from '../utils'
import type { ChatMessage, OSActionCard as OSActionCardType } from '../types'

interface ChatMessageItemProps {
    msg: ChatMessage
    allMessages: ChatMessage[]
    roster: PhilosopherBot[]
    activeBot: PhilosopherBot
    onInsert: (text: string) => void
    onExecuteOSAction: (msgId: string, action: OSActionCardType) => void
}

/**
 * Renders a single chat message in one of three layouts:
 * - system: centered pill (e.g. "Switched to Nietzsche")
 * - user: right-aligned bubble
 * - ai: left-aligned with ReasoningAnswer, MarkdownRenderer, OSActionCard, Insert button
 */
export function ChatMessageItem({
    msg,
    allMessages,
    roster,
    activeBot,
    onInsert,
    onExecuteOSAction,
}: ChatMessageItemProps): JSX.Element {
    const bot =
        msg.sender === 'ai' && msg.philosopherId
            ? getPhilosopherBot(msg.philosopherId, roster)
            : activeBot

    // ── System message ───────────────────────────────────────────────────────
    if (msg.sender === 'system') {
        return (
            <div className="flex justify-center my-2 select-none">
                <div className="flex items-center gap-1.5 text-[10px] text-muted bg-surface-primary border border-[var(--color-border-primary)] rounded-full px-3 py-0.5 shadow-2xs">
                    <span>🔀</span>
                    <span className="font-medium text-secondary">{msg.text}</span>
                </div>
            </div>
        )
    }

    // ── User message ─────────────────────────────────────────────────────────
    if (msg.sender === 'user') {
        return (
            <div className="flex justify-end my-2">
                <div className="max-w-[85%] bg-surface-primary border border-[var(--color-border-primary)] text-primary rounded-xl px-3.5 py-2 text-xs leading-relaxed font-normal shadow-xs">
                    {msg.text}
                </div>
            </div>
        )
    }

    // ── AI message ───────────────────────────────────────────────────────────
    const hasText = !!msg.text && msg.text.trim().length > 0

    return (
        <div className="space-y-2 my-3 min-w-0">
            {/* Reasoning / thinking stages panel */}
            <div className="px-1">
                <ReasoningAnswer
                    id={`${msg.id}-thought`}
                    completed={hasText || !msg.isStreaming}
                    content={msg.thought || ''}
                    stages={msg.thinkingStages}
                    latencyMs={msg.latencyMs}
                />
            </div>

            {/* Reply card */}
            {(hasText || (!msg.isStreaming && !msg.thinkingStages?.length)) && (
                <div className="bg-surface-primary border border-[var(--color-border-primary)] rounded-xl p-3 space-y-2 shadow-xs">
                    {/* Bot header */}
                    <div className="flex items-center gap-2">
                        <ProfilePicture user={philosopherAsUser(bot)} size="sm" />
                        <div className="flex justify-between items-center gap-2 min-w-0 flex-1">
                            <span className="font-semibold text-xs text-primary truncate">{bot.name}</span>
                            <span className="text-[10px] text-muted shrink-0">{msg.timestamp}</span>
                        </div>
                    </div>

                    {/* Reply body */}
                    <MarkdownRenderer text={msg.text} isStreaming={msg.isStreaming} />

                    {/* OS Action card */}
                    {msg.osAction && (
                        <OSActionCard
                            action={msg.osAction}
                            onExecute={() => onExecuteOSAction(msg.id, msg.osAction!)}
                        />
                    )}
                </div>
            )}

            {/* Smart insert button */}
            {shouldShowInsertButton(msg, allMessages) && (
                <div className="pt-1 px-1 flex justify-start">
                    <LemonButton
                        size="xsmall"
                        type="secondary"
                        icon={msg.hasTable ? <IconTable /> : <IconPlus />}
                        onClick={(e) => {
                            e.stopPropagation()
                            onInsert(msg.text)
                        }}
                        tooltip="Insert content block into active notebook document"
                    >
                        {msg.hasTable ? 'Insert table into notebook' : 'Insert into notebook'}
                    </LemonButton>
                </div>
            )}
        </div>
    )
}
