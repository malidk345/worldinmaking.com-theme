import { useState, useRef, useEffect, useMemo } from 'react'
import { LemonButton, LemonSelect, ProfilePicture, LemonTag } from '~nb-lib/lemon-ui/index'
import { IconSparkles, IconChevronDown, IconArrowRight, IconTrash, IconPlus } from '@posthog/icons'
import {
    PHILOSOPHER_BOTS,
    getPhilosopherBot,
    philosopherAsUser,
    fetchPhilosopherRosterWithAvatars,
    type PhilosopherBot,
} from '~nb-lib/philosophers'
import { useSiteThemeSync } from '../../lib/useSiteThemeSync'
import { ReasoningAnswer } from './ReasoningAnswer'
import { Popover } from 'components/RadixUI/Popover'
import OSButton from 'components/OSButton'

export interface AskAIDropdownProps {
    onInsertPromptBlock: (initialPrompt?: string) => void
}

export interface ThinkingStageView {
    id: string
    label: string
    text: string
}

export interface ChatMessage {
    id: string
    sender: 'user' | 'ai'
    text: string
    timestamp: string
    philosopherId?: string
    thought?: string
    thinkingStages?: ThinkingStageView[]
    latencyMs?: number
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
    const [isOpen, setIsOpen] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [roster, setRoster] = useState<PhilosopherBot[]>(PHILOSOPHER_BOTS)
    const [selectedBotId, setSelectedBotId] = useState(PHILOSOPHER_BOTS[0]!.id)
    const [isGenerating, setIsGenerating] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const chatEndRef = useRef<HTMLDivElement | null>(null)

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

            let res = await fetch('/api/bots/act', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    bot: activeBot.id,
                    question,
                    mood: 'calm',
                    taskType: 'paper_section',
                    thinkingDepth: 'standard',
                }),
            })

            if (res.status === 404 || res.status === 405) {
                res = await fetch('/api/philosopher-bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        philosopher: activeBot.id,
                        question,
                        mood: 'calm',
                        taskType: 'paper_section',
                        thinkingDepth: 'standard',
                    }),
                })
            }

            let data: any = null
            try {
                data = await res.json()
            } catch {
                data = null
            }

            const reply =
                (typeof data?.reply === 'string' && data.reply.trim()) ||
                (typeof data?.error === 'string' && data.error) ||
                (res.ok
                    ? `${activeBot.name} could not form a reply. Try again.`
                    : `Request failed (${res.status}). Try again.`)

            if (data?.success === false || res.status >= 400) {
                console.warn('[AskAI] provider failure', {
                    status: res.status,
                    provider: data?.provider,
                    configured: data?.configured,
                    attempts: data?.attempts,
                })
            }

            const stages: ThinkingStageView[] = Array.isArray(data?.thinking?.stages)
                ? data.thinking.stages
                      .filter((s: any) => s && typeof s.text === 'string' && s.text.trim())
                      .map((s: any) => ({
                          id: String(s.id || 'raw'),
                          label: String(s.label || s.id || 'Thought'),
                          text: String(s.text).trim(),
                      }))
                : []

            const thoughtText =
                typeof data?.thought === 'string' && data.thought.trim()
                    ? data.thought.trim()
                    : stages.length > 0
                      ? stages.map((s) => s.text).join('\n\n')
                      : undefined

            const latencyMs =
                typeof data?.latencyMs === 'number' && Number.isFinite(data.latencyMs) ? data.latencyMs : undefined

            setMessages((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-a`,
                    sender: 'ai',
                    text: reply,
                    thought: thoughtText,
                    thinkingStages: stages.length > 0 ? stages : undefined,
                    latencyMs,
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

    // Same shell as site Display Options / OS Header menus
    const contentClassName =
        'w-[min(100vw-1rem,28rem)] sm:w-[min(96vw,36rem)] lg:w-[min(96vw,40rem)] max-h-[min(78dvh,40rem)] overflow-hidden p-0 border border-primary'

    return (
        <Popover
            open={isOpen}
            onOpenChange={setIsOpen}
            dataScheme="primary"
            side="bottom"
            sideOffset={8}
            contentClassName={contentClassName}
            trigger={
                <OSButton
                    size="md"
                    icon={<IconSparkles className="size-4" />}
                    hover="background"
                    active={isOpen}
                    tooltip="Open philosopher AI chat"
                >
                    <span className="hidden sm:inline font-medium">Ask AI</span>
                    <IconChevronDown className="size-5 -mr-1 hidden sm:inline" />
                </OSButton>
            }
        >
            {/* Lemon controls still need notebook scope for their CSS variables */}
            <div
                className={`notebook-app-scope flex flex-col gap-3 p-3 max-h-[min(78dvh,40rem)] overflow-y-auto overscroll-contain ${
                    hostTheme === 'dark' ? 'dark' : ''
                }`}
                data-host-theme={hostTheme}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-primary">
                    <div className="flex items-center gap-2 min-w-0">
                        <ProfilePicture user={philosopherAsUser(activeBot)} size="md" />
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-primary text-sm truncate">{activeBot.displayName}</span>
                                <LemonTag type="muted" size="small">
                                    Bot
                                </LemonTag>
                            </div>
                            <p className="text-[11px] text-secondary mt-0.5 mb-0 truncate">{activeBot.shortStance}</p>
                        </div>
                    </div>
                    {hasThread && (
                        <OSButton
                            size="sm"
                            icon={<IconTrash />}
                            hover="background"
                            onClick={() => setMessages([])}
                            tooltip="Clear conversation"
                        >
                            <span className="hidden sm:inline">Clear</span>
                        </OSButton>
                    )}
                </div>

                {!hasThread && (
                    <div className="space-y-2.5 shrink-0">
                        <p className="text-xs text-secondary mb-0 leading-snug">
                            Chat with a resident philosopher. Stance and style come from the WorldInMaking persona
                            engine.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {SUGGESTIONS.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    className="text-left text-xs px-2.5 py-1.5 rounded border border-primary bg-primary hover:bg-accent transition-colors text-primary"
                                    onClick={() => void sendPrompt(suggestion)}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {hasThread && (
                    <div className="flex-1 min-h-0 max-h-[min(38dvh,280px)] sm:max-h-[min(42dvh,340px)] overflow-y-auto overscroll-contain space-y-3 pr-0.5 text-xs leading-relaxed">
                        {messages.map((msg) => {
                            const bot =
                                msg.sender === 'ai' && msg.philosopherId
                                    ? getPhilosopherBot(msg.philosopherId, roster)
                                    : activeBot
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-secondary font-mono">
                                        {msg.sender === 'ai' ? (
                                            <>
                                                <ProfilePicture user={philosopherAsUser(bot)} size="xs" />
                                                <span className="font-semibold text-primary">{bot.name}</span>
                                            </>
                                        ) : (
                                            <span className="font-semibold">You</span>
                                        )}
                                        <span>• {msg.timestamp}</span>
                                    </div>

                                    <div
                                        className={`flex flex-col gap-1.5 max-w-[92%] ${
                                            msg.sender === 'user' ? 'items-end' : 'items-start'
                                        }`}
                                    >
                                        {msg.sender === 'ai' && (msg.thinkingStages?.length || msg.thought) && (
                                            <ReasoningAnswer
                                                id={`${msg.id}-thought`}
                                                completed
                                                content={msg.thought || ''}
                                                stages={msg.thinkingStages}
                                                latencyMs={msg.latencyMs}
                                            />
                                        )}

                                        <div
                                            className={`p-3 rounded border border-primary text-primary whitespace-pre-wrap w-full ${
                                                msg.sender === 'user' ? 'bg-accent' : 'bg-primary'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>

                                        {msg.sender === 'ai' && (
                                            <div className="self-start mt-0.5">
                                                <OSButton
                                                    size="sm"
                                                    icon={<IconPlus />}
                                                    hover="background"
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
                                                </OSButton>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {isGenerating && (
                            <div className="flex flex-col gap-1.5 items-start w-full max-w-[92%]">
                                <div className="flex items-center gap-1.5 text-[10px] text-secondary font-mono">
                                    <ProfilePicture user={philosopherAsUser(activeBot)} size="xs" />
                                    <span className="font-semibold text-primary">{activeBot.name}</span>
                                </div>
                                <ReasoningAnswer id="live-thinking" completed={false} />
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                )}

                <div className="relative flex flex-col border border-primary bg-primary rounded p-2.5 sm:p-3 focus-within:border-input transition-colors shrink-0">
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
                        rows={3}
                        className="w-full bg-transparent text-sm text-primary placeholder:text-secondary focus:outline-none resize-none leading-relaxed min-h-[72px] sm:min-h-[96px] p-0 border-none shadow-none"
                    />

                    <div className="flex items-center justify-between pt-2 mt-1 gap-2 min-w-0">
                        <div className="notebook-app-scope min-w-0 max-w-[min(200px,45vw)] sm:max-w-[min(280px,50vw)]">
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
                                className="border border-primary !py-0.5 !px-2 w-full min-w-0"
                            />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-secondary text-[10px] hidden sm:inline font-mono">Cmd + Enter</span>
                            <OSButton
                                size="md"
                                variant="primary"
                                icon={<IconArrowRight className="size-4" />}
                                onClick={() => void sendPrompt()}
                                disabled={isGenerating || !prompt.trim()}
                                tooltip={`Send to ${activeBot.name}`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Popover>
    )
}
