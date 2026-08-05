import { useState, useRef, useEffect, useMemo } from 'react'
import { LemonDropdown, LemonButton, LemonSelect, ProfilePicture, LemonTag } from '~nb-lib/lemon-ui/index'
import { IconSparkles, IconChevronDown, IconArrowRight, IconTrash, IconPlus } from '@posthog/icons'
import {
    PHILOSOPHER_BOTS,
    getPhilosopherBot,
    philosopherAsUser,
    fetchPhilosopherRosterWithAvatars,
    type PhilosopherBot,
} from '~nb-lib/philosophers'
import { useSiteThemeSync } from '../../lib/useSiteThemeSync'

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

function buildBotSelectOptions(roster: PhilosopherBot[]) {
    return [
        {
            title: 'Philosopher bots',
            options: roster.map((bot) => ({
                value: bot.id,
                label: (
                    <span className="flex items-center gap-2 py-0.5 min-w-0">
                        <ProfilePicture user={philosopherAsUser(bot)} size="sm" />
                        <span className="flex flex-col leading-tight min-w-0">
                            <span className="font-medium text-xs truncate text-primary">{bot.displayName}</span>
                            <span className="text-[10px] text-muted truncate">{bot.shortStance}</span>
                        </span>
                    </span>
                ),
            })),
        },
    ]
}

export function AskAIDropdown({ onInsertPromptBlock }: AskAIDropdownProps): JSX.Element {
    const hostTheme = useSiteThemeSync()
    const isDark = hostTheme === 'dark'
    const [isOpen, setIsOpen] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [roster, setRoster] = useState<PhilosopherBot[]>(PHILOSOPHER_BOTS)
    const [selectedBotId, setSelectedBotId] = useState(PHILOSOPHER_BOTS[0]!.id)
    const [isGenerating, setIsGenerating] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const chatEndRef = useRef<HTMLDivElement | null>(null)

    // Load real site profile avatars (Supabase profiles via /api/philosopher-bots)
    useEffect(() => {
        let cancelled = false
        fetchPhilosopherRosterWithAvatars().then((next) => {
            if (!cancelled) setRoster(next)
        })
        return () => {
            cancelled = true
        }
    }, [])

    const activeBot = useMemo(() => getPhilosopherBot(selectedBotId, roster), [selectedBotId, roster])
    const botSelectOptions = useMemo(() => buildBotSelectOptions(roster), [roster])
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
            const history = messages
                .slice(-6)
                .map((m) => `${m.sender === 'user' ? 'User' : m.philosopherId || 'Philosopher'}: ${m.text}`)
                .join('\n')

            const question = history ? `Previous conversation:\n${history}\n\nUser: ${text}` : text

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

            // Production often returns 503 when keys are missing — still show message in thread
            if (data?.success === false || res.status >= 400) {
                console.warn('[AskAI] provider failure', {
                    status: res.status,
                    provider: data?.provider,
                    configured: data?.configured,
                    attempts: data?.attempts,
                })
            }

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
            onClickOutside={() => setIsOpen(false)}
            dropdownPlacement="bottom-end"
            overlay={
                <div
                    className={`notebook-popover-panel notebook-app-scope w-[1100px] max-w-[96vw] p-3 rounded-xl shadow-2xl flex flex-col gap-3 ${
                        isDark ? 'dark' : ''
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border-3000,#e2e8f0)] gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <ProfilePicture user={philosopherAsUser(activeBot)} size="md" />
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-bold text-primary text-sm truncate">
                                        {activeBot.displayName}
                                    </span>
                                    <LemonTag type="muted" size="small">
                                        Bot
                                    </LemonTag>
                                </div>
                                <p className="text-[11px] text-muted mt-0.5 mb-0 truncate">{activeBot.shortStance}</p>
                            </div>
                        </div>

                        {hasThread && (
                            <LemonButton
                                size="xsmall"
                                type="tertiary"
                                icon={<IconTrash />}
                                onClick={() => setMessages([])}
                                tooltip="Clear conversation"
                            >
                                Clear Thread
                            </LemonButton>
                        )}
                    </div>

                    {/* Empty state: suggestions */}
                    {!hasThread && (
                        <div className="space-y-3 py-1">
                            <p className="text-xs text-muted mb-0">
                                Speak with one of the 16 resident philosophers. Their voice, stance, and style come from
                                the WorldInMaking persona engine.
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {SUGGESTIONS.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        className="text-left text-xs px-2.5 py-1.5 rounded-full border border-[var(--border-3000,#e2e8f0)] bg-[var(--color-bg-surface-secondary)] hover:bg-[var(--color-bg-fill-tertiary)] transition-colors text-primary"
                                        onClick={() => void sendPrompt(suggestion)}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Conversation thread */}
                    {hasThread && (
                        <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1 pb-1 text-xs leading-relaxed">
                            {messages.map((msg) => {
                                const bot =
                                    msg.sender === 'ai' && msg.philosopherId
                                        ? getPhilosopherBot(msg.philosopherId, roster)
                                        : activeBot
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col ${
                                            msg.sender === 'user' ? 'items-end' : 'items-start'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted font-mono">
                                            {msg.sender === 'ai' ? (
                                                <>
                                                    <ProfilePicture user={philosopherAsUser(bot)} size="xs" />
                                                    <span className="font-semibold text-primary">{bot.name}</span>
                                                </>
                                            ) : (
                                                <span className="font-semibold text-secondary">You</span>
                                            )}
                                            <span>• {msg.timestamp}</span>
                                        </div>

                                        <div
                                            className={`flex flex-col gap-1.5 max-w-[92%] ${
                                                msg.sender === 'user' ? 'items-end' : 'items-start'
                                            }`}
                                        >
                                            <div
                                                className={`p-3 rounded-xl border border-[var(--border-3000,#e2e8f0)] text-primary whitespace-pre-wrap w-full ${
                                                    msg.sender === 'user'
                                                        ? 'bg-[var(--color-bg-fill-tertiary)]'
                                                        : 'bg-[var(--color-bg-surface-secondary)] shadow-inner'
                                                }`}
                                            >
                                                {msg.text}
                                            </div>

                                            {msg.sender === 'ai' && (
                                                <div className="self-start mt-0.5">
                                                    <LemonButton
                                                        size="xsmall"
                                                        type="secondary"
                                                        icon={<IconPlus />}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            e.preventDefault()
                                                            const attribution = `— ${bot.displayName}`
                                                            onInsertPromptBlock(`${msg.text}\n\n${attribution}`)
                                                            setIsOpen(false)
                                                        }}
                                                        tooltip="Insert into notebook"
                                                    >
                                                        Insert into Notebook
                                                    </LemonButton>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}

                            {isGenerating && (
                                <div className="flex items-center gap-2 text-muted text-xs py-2 italic">
                                    <ProfilePicture user={philosopherAsUser(activeBot)} size="xs" />
                                    <span>
                                        <span className="font-semibold text-primary">{activeBot.name}</span>
                                        {' is thinking...'}
                                    </span>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    )}

                    {/* Input */}
                    <div className="relative flex flex-col border border-[var(--border-3000,#e2e8f0)] bg-[var(--color-bg-fill-input)] rounded-xl p-3 focus-within:border-[var(--primary-3000,#eb9d2a)] shadow-sm transition-colors">
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
                            placeholder={
                                messages.length === 0
                                    ? `Ask ${activeBot.name} anything...`
                                    : `Reply to ${activeBot.name} (Cmd + Enter)...`
                            }
                            rows={4}
                            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none resize-none leading-relaxed min-h-[110px] p-0 border-none shadow-none"
                        />

                        <div className="flex items-center justify-between pt-2 mt-1 gap-2">
                            <LemonSelect
                                value={selectedBotId}
                                onChange={(val) => {
                                    setSelectedBotId(val || roster[0]!.id)
                                    setMessages([])
                                }}
                                options={botSelectOptions}
                                size="small"
                                type="tertiary"
                                dropdownPlacement="top-start"
                                dropdownMatchSelectWidth={false}
                                className="border border-[var(--border-3000,#e2e8f0)] !py-0.5 !px-2 max-w-[min(320px,50vw)]"
                            />

                            <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-muted text-[10px] hidden sm:inline font-mono">Cmd + Enter</span>
                                <LemonButton
                                    type="primary"
                                    size="small"
                                    icon={<IconArrowRight />}
                                    onClick={() => void sendPrompt()}
                                    loading={isGenerating}
                                    disabled={!prompt.trim()}
                                    tooltip={`Send to ${activeBot.name} (Cmd + Enter)`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            <LemonButton
                type="secondary"
                size="small"
                icon={<IconSparkles className="text-amber-500" />}
                sideIcon={<IconChevronDown />}
                onClick={() => setIsOpen(!isOpen)}
                tooltip="Open philosopher AI chat"
            >
                <span className="hidden sm:inline font-medium">Ask AI</span>
            </LemonButton>
        </LemonDropdown>
    )
}
