import { useState, useRef, useEffect, useMemo } from 'react'
import { LemonDropdown, LemonButton, LemonSelect, ProfilePicture, LemonTag } from '~nb-lib/lemon-ui/index'
import { IconSparkles, IconChevronDown, IconArrowRight, IconTrash, IconPlus } from '@posthog/icons'
import { PHILOSOPHER_BOTS, getPhilosopherBot } from '~nb-lib/philosophers'

export interface AskAIDropdownProps {
    onInsertPromptBlock: (initialPrompt?: string) => void
}

export interface ChatMessage {
    id: string
    sender: 'user' | 'ai'
    text: string
    timestamp: string
    philosopherId?: string
    thought?: string
}

const SUGGESTIONS = [
    'What is at stake in this notebook?',
    'Challenge the main claim',
    'Rewrite this more rigorously',
    'Give a counter-position',
]

const BOT_SELECT_OPTIONS = [
    {
        title: 'Philosopher bots',
        options: PHILOSOPHER_BOTS.map((bot) => ({
            value: bot.id,
            label: (
                <span className="flex items-center gap-2 py-0.5 min-w-0">
                    <ProfilePicture user={{ first_name: bot.name }} size="sm" />
                    <span className="flex flex-col leading-tight min-w-0">
                        <span className="font-medium text-xs truncate">{bot.displayName}</span>
                        <span className="text-[10px] text-muted truncate">{bot.shortStance}</span>
                    </span>
                </span>
            ),
        })),
    },
]

export function AskAIDropdown({ onInsertPromptBlock }: AskAIDropdownProps): JSX.Element {
    const [isOpen, setIsOpen] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [selectedBotId, setSelectedBotId] = useState(PHILOSOPHER_BOTS[0]!.id)
    const [isGenerating, setIsGenerating] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const chatEndRef = useRef<HTMLDivElement | null>(null)

    const activeBot = useMemo(() => getPhilosopherBot(selectedBotId), [selectedBotId])
    const hasThread = messages.length > 0 || isGenerating

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => textareaRef.current?.focus(), 50)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isGenerating])

    const sendPrompt = async (raw?: string) => {
        const text = (raw ?? prompt).trim()
        if (!text || isGenerating) return

        const userMsg: ChatMessage = {
            id: `${Date.now()}-u`,
            sender: 'user',
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }

        setMessages((prev) => [...prev, userMsg])
        setPrompt('')
        setIsGenerating(true)

        try {
            // Build brief conversation context for continuity
            const history = messages
                .slice(-6)
                .map((m) => `${m.sender === 'user' ? 'User' : m.philosopherId || 'Philosopher'}: ${m.text}`)
                .join('\n')

            const question = history
                ? `Previous conversation:\n${history}\n\nUser: ${text}`
                : text

            const res = await fetch('/api/philosopher-bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    philosopher: activeBot.id,
                    mood: 'calm',
                    taskType: 'paper_section',
                }),
            })

            const data = await res.json()
            const reply =
                (typeof data?.reply === 'string' && data.reply.trim()) ||
                (typeof data?.error === 'string' && data.error) ||
                `${activeBot.name} could not form a reply. Try again.`

            setMessages((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-a`,
                    sender: 'ai',
                    text: reply,
                    thought: typeof data?.thought === 'string' ? data.thought : undefined,
                    philosopherId: activeBot.id,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
            ])
        } catch (error) {
            console.warn('[AskAI] philosopher-bot error:', error)
            setMessages((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-a`,
                    sender: 'ai',
                    text: 'The philosopher network is unreachable right now. Please try again in a moment.',
                    philosopherId: activeBot.id,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
            ])
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <LemonDropdown
            visible={isOpen}
            onVisibilityChange={setIsOpen}
            onClickOutside={() => setIsOpen(false)}
            placement="bottom-end"
            closeOnClickInside={false}
            overlay={
                <div className="w-[min(440px,92vw)] flex flex-col text-primary" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                        <ProfilePicture user={{ first_name: activeBot.name }} size="lg" />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-semibold text-sm leading-none truncate">
                                    {activeBot.displayName}
                                </span>
                                <LemonTag type="muted" size="small">
                                    Bot
                                </LemonTag>
                            </div>
                            <p className="text-[11px] text-muted mt-1 mb-0 truncate">{activeBot.shortStance}</p>
                        </div>
                        {hasThread && (
                            <LemonButton
                                size="xsmall"
                                type="tertiary"
                                icon={<IconTrash />}
                                onClick={() => setMessages([])}
                                tooltip="Clear conversation"
                            />
                        )}
                    </div>

                    {/* Thread */}
                    <div className="px-3 max-h-[340px] overflow-y-auto">
                        {!hasThread ? (
                            <div className="py-2 space-y-3">
                                <p className="text-xs text-muted mb-0">
                                    Speak with one of the 16 resident philosophers. Their voice, stance, and style come
                                    from the WorldInMaking persona engine.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {SUGGESTIONS.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            className="text-left text-xs px-2.5 py-1.5 rounded-full border border-border bg-surface-secondary hover:bg-surface-tertiary transition-colors"
                                            onClick={() => void sendPrompt(suggestion)}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-1 space-y-3">
                                {messages.map((msg) => {
                                    const bot =
                                        msg.sender === 'ai' && msg.philosopherId
                                            ? getPhilosopherBot(msg.philosopherId)
                                            : activeBot
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col gap-1 ${
                                                msg.sender === 'user' ? 'items-end' : 'items-start'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted">
                                                {msg.sender === 'ai' ? (
                                                    <>
                                                        <ProfilePicture user={{ first_name: bot.name }} size="xs" />
                                                        <span className="font-medium text-secondary">{bot.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="font-medium text-secondary">You</span>
                                                )}
                                                <span>{msg.timestamp}</span>
                                            </div>

                                            <div
                                                className={`max-w-[92%] text-xs leading-relaxed whitespace-pre-wrap px-3 py-2 rounded-2xl ${
                                                    msg.sender === 'user'
                                                        ? 'bg-blue text-white rounded-br-md'
                                                        : 'bg-surface-secondary text-primary rounded-bl-md'
                                                }`}
                                            >
                                                {msg.text}
                                            </div>

                                            {msg.sender === 'ai' && (
                                                <LemonButton
                                                    size="xsmall"
                                                    type="tertiary"
                                                    icon={<IconPlus />}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        e.preventDefault()
                                                        const attribution = `— ${bot.displayName}`
                                                        onInsertPromptBlock(`${msg.text}\n\n${attribution}`)
                                                        setIsOpen(false)
                                                    }}
                                                >
                                                    Insert into notebook
                                                </LemonButton>
                                            )}
                                        </div>
                                    )
                                })}

                                {isGenerating && (
                                    <div className="flex items-center gap-2 text-xs text-muted py-1">
                                        <ProfilePicture user={{ first_name: activeBot.name }} size="xs" />
                                        <span>
                                            <span className="font-medium text-secondary">{activeBot.name}</span> is
                                            thinking…
                                        </span>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Composer */}
                    <div className="px-3 pt-2 pb-3 mt-1 border-t border-border space-y-2">
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault()
                                    void sendPrompt()
                                }
                            }}
                            placeholder={`Ask ${activeBot.name}…`}
                            rows={3}
                            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none resize-none leading-relaxed min-h-[72px] p-0 border-none shadow-none"
                        />

                        <div className="flex items-center justify-between gap-2">
                            <LemonSelect
                                value={selectedBotId}
                                onChange={(val) => {
                                    if (val) setSelectedBotId(val)
                                }}
                                options={BOT_SELECT_OPTIONS}
                                size="xsmall"
                                type="tertiary"
                                dropdownPlacement="top-start"
                                dropdownMatchSelectWidth={false}
                            />

                            <div className="flex items-center gap-2">
                                <span className="text-muted text-[10px] hidden sm:inline">⌘↵</span>
                                <LemonButton
                                    type="primary"
                                    size="small"
                                    icon={<IconArrowRight />}
                                    onClick={() => void sendPrompt()}
                                    loading={isGenerating}
                                    disabled={!prompt.trim()}
                                    tooltip={`Send to ${activeBot.displayName}`}
                                >
                                    Send
                                </LemonButton>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            <LemonButton
                type="secondary"
                size="small"
                icon={<IconSparkles className="text-orange" />}
                sideIcon={<IconChevronDown />}
                tooltip="Ask a philosopher bot"
            >
                <span className="hidden sm:inline font-medium">Ask AI</span>
            </LemonButton>
        </LemonDropdown>
    )
}
