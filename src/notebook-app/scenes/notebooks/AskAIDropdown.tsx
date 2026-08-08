import { useState, useRef, useEffect, useMemo } from 'react'
import {
    LemonDropdown,
    LemonButton,
    LemonSelect,
    LemonTag,
    ProfilePicture,
} from '~nb-lib/lemon-ui/index'
import {
    IconSparkles,
    IconChevronDown,
    IconArrowRight,
    IconTrash,
    IconPlus,
    IconTable,
    IconPencil,
    IconList,
} from '@posthog/icons'
import {
    PHILOSOPHER_BOTS,
    getPhilosopherBot,
    philosopherAsUser,
    fetchPhilosopherRosterWithAvatars,
    type PhilosopherBot,
} from '~nb-lib/philosophers'
import { useSiteThemeSync } from '../../lib/useSiteThemeSync'
import { ReasoningAnswer } from './ReasoningAnswer'

export interface AskAIDropdownProps {
    onInsertPromptBlock: (initialPrompt?: string, mode?: 'append' | 'replace' | 'prepend') => void
    currentNotebookContent?: string
}

export interface ThinkingStageView {
    id: string
    label: string
    text: string
}

export interface ChatMessage {
    id: string
    sender: 'user' | 'ai' | 'system'
    text: string
    timestamp: string
    philosopherId?: string
    thought?: string
    thinkingStages?: ThinkingStageView[]
    latencyMs?: number
    hasTable?: boolean
}

const EDITORIAL_SUGGESTIONS = [
    { label: 'Comparison table', icon: IconTable, prompt: 'Convert this notebook data into a structured Markdown comparison table' },
    { label: 'Executive summary', icon: IconSparkles, prompt: 'Generate a concise Executive Summary with key takeaways for the top of this notebook' },
    { label: 'Polish & format', icon: IconPencil, prompt: 'Polish and format this notebook into clean Markdown with proper headers and bullet points' },
    { label: 'Extract tasks', icon: IconList, prompt: 'Extract an Actionable Task List (To-Do items) from this notebook' },
    { label: 'Translate to Turkish', icon: IconSparkles, prompt: 'Translate the entire notebook content into Turkish keeping all formatting' },
    { label: 'Rewrite rigorously', icon: IconPencil, prompt: 'Rewrite & refactor this notebook in a more rigorous and persuasive tone' },
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

/**
 * Content layout matches CollaboratorsBanner / NotebookSelectButton.
 * Shell (bg, border, radius, shadow) comes from Lemon Popover__box — do not re-chrome here.
 */
const panelClassName =
    'w-[min(100vw-1.5rem,28rem)] sm:w-[36rem] max-h-[min(78dvh,40rem)] p-3 space-y-3 text-xs overflow-y-auto overscroll-contain bg-surface-secondary'

export function AskAIDropdown({ onInsertPromptBlock, currentNotebookContent }: AskAIDropdownProps): JSX.Element {
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

    const contentLength = currentNotebookContent?.length || 0

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

            const notebookContextSnippet = currentNotebookContent?.trim()
                ? `[NOTEBOOK CONTENT CONTEXT]\nThe user is working on a notebook with the following markdown content:\n"""\n${currentNotebookContent.slice(0, 5000)}\n"""\nPerform the user's requested editorial task accurately using this notebook context.\n`
                : ''

            const fullQuestionPrompt = `${notebookContextSnippet}${
                history ? `Previous conversation:\n${history}\n\nUser directive: ${text}` : text
            }`

            let res = await fetch('/api/bots/act', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    bot: activeBot.id,
                    question: fullQuestionPrompt,
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
                        question: fullQuestionPrompt,
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

            const containsTable = reply.includes('|') && reply.includes('---')

            setMessages((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-a`,
                    sender: 'ai',
                    text: reply,
                    thought: thoughtText,
                    thinkingStages: stages.length > 0 ? stages : undefined,
                    latencyMs: typeof data?.latencyMs === 'number' ? data.latencyMs : undefined,
                    philosopherId: activeBot.id,
                    hasTable: containsTable,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
            ])
        } catch (error) {
            console.warn('[Ask AI] error:', error)
            setMessages((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-a`,
                    sender: 'ai',
                    text: 'The philosopher network is unreachable right now. Please try again.',
                    philosopherId: activeBot.id,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
            ])
        } finally {
            setIsGenerating(false)
        }
    }

    const handleBotChange = (nextBotId: string) => {
        if (!nextBotId || nextBotId === selectedBotId) return
        const nextBot = getPhilosopherBot(nextBotId, roster)
        setSelectedBotId(nextBotId)

        if (messages.length > 0) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-sys`,
                    sender: 'system',
                    text: `Switched bot to ${nextBot.name}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
            ])
        }
    }

    const overlay = (
        <div className={panelClassName} onClick={(e) => e.stopPropagation()}>
            {/* Header with Context Indicator */}
            <div className="flex items-center justify-between pb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <ProfilePicture user={philosopherAsUser(activeBot)} size="md" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-xs text-primary truncate">{activeBot.displayName}</span>
                            {contentLength > 0 && (
                                <LemonTag type="completion" size="small" className="text-[9px]">
                                    Context Active ({contentLength} chars)
                                </LemonTag>
                            )}
                        </div>
                        <p className="text-[10px] text-muted mt-0.5 mb-0 truncate">{activeBot.shortStance}</p>
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
                        Clear
                    </LemonButton>
                )}
            </div>

            {!hasThread && (
                <div className="space-y-2.5">
                    <p className="text-secondary mb-0 leading-snug">
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
                                    onClick={() => void sendPrompt(item.prompt)}
                                    className="justify-start text-left truncate"
                                >
                                    <span className="truncate">{item.label}</span>
                                </LemonButton>
                            )
                        })}
                    </div>
                </div>
            )}

            {hasThread && (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {messages.map((msg) => {
                        const bot =
                            msg.sender === 'ai' && msg.philosopherId
                                ? getPhilosopherBot(msg.philosopherId, roster)
                                : activeBot

                        if (msg.sender === 'system') {
                            return (
                                <div key={msg.id} className="flex justify-center my-2 select-none">
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted bg-surface-primary border border-[var(--color-border-primary)] rounded-full px-3 py-0.5 shadow-2xs">
                                        <span>🔀</span>
                                        <span className="font-medium text-secondary">{msg.text}</span>
                                    </div>
                                </div>
                            )
                        }

                        if (msg.sender === 'user') {
                            return (
                                <div key={msg.id} className="flex justify-end my-2">
                                    <div className="max-w-[85%] bg-surface-primary border border-[var(--color-border-primary)] text-primary rounded-xl px-3.5 py-2 text-xs leading-relaxed font-normal shadow-xs">
                                        {msg.text}
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <div key={msg.id} className="space-y-2 my-3">
                                {/* Thought Process OUTSIDE of the AI reply box */}
                                {msg.sender === 'ai' && (msg.thinkingStages?.length || msg.thought) && (
                                    <div className="px-1">
                                        <ReasoningAnswer
                                            id={`${msg.id}-thought`}
                                            completed
                                            content={msg.thought || ''}
                                            stages={msg.thinkingStages}
                                            latencyMs={msg.latencyMs}
                                        />
                                    </div>
                                )}

                                {/* AI Reply Box — White container on gray panel */}
                                <div className="bg-surface-primary border border-[var(--color-border-primary)] rounded-xl p-3 space-y-2 shadow-xs">
                                    <div className="flex items-center gap-2">
                                        <ProfilePicture user={philosopherAsUser(bot)} size="sm" />
                                        <div className="flex justify-between items-center gap-2 min-w-0 flex-1">
                                            <span className="font-semibold text-xs text-primary truncate">{bot.name}</span>
                                            <span className="text-[10px] text-muted shrink-0">{msg.timestamp}</span>
                                        </div>
                                    </div>

                                    <p className="text-primary text-xs leading-relaxed whitespace-pre-wrap mb-0">{msg.text}</p>

                                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--color-border-primary)]/30">
                                        {msg.hasTable && (
                                            <LemonButton
                                                size="xsmall"
                                                type="secondary"
                                                icon={<IconTable />}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onInsertPromptBlock(msg.text, 'append')
                                                    setIsOpen(false)
                                                }}
                                            >
                                                Insert table
                                            </LemonButton>
                                        )}
                                        <LemonButton
                                            size="xsmall"
                                            type="tertiary"
                                            icon={<IconPlus />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onInsertPromptBlock(msg.text, 'append')
                                                setIsOpen(false)
                                            }}
                                            tooltip="Append to bottom of notebook"
                                        >
                                            Append
                                        </LemonButton>
                                        <LemonButton
                                            size="xsmall"
                                            type="tertiary"
                                            icon={<IconPencil />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (confirm('Replace current notebook content with this AI text?')) {
                                                    onInsertPromptBlock(msg.text, 'replace')
                                                    setIsOpen(false)
                                                }
                                            }}
                                            tooltip="Replace entire notebook content"
                                        >
                                            Replace note
                                        </LemonButton>
                                        <LemonButton
                                            size="xsmall"
                                            type="tertiary"
                                            icon={<IconPlus />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onInsertPromptBlock(msg.text, 'prepend')
                                                setIsOpen(false)
                                            }}
                                            tooltip="Prepend at top of notebook"
                                        >
                                            Prepend top
                                        </LemonButton>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {isGenerating && (
                        <div className="space-y-2 my-3">
                            <div className="px-1">
                                <ReasoningAnswer id="live-thinking" completed={false} />
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            )}

            {/* Composer Input Card — White box on gray panel */}
            <div className="mt-2 bg-surface-primary border border-[var(--color-border-primary)] rounded-xl p-2.5 space-y-2 shadow-xs">
                <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            void sendPrompt()
                        }
                    }}
                    placeholder="Ask follow-up or / for commands..."
                    rows={2}
                    className="w-full bg-transparent text-xs text-primary placeholder:text-muted focus:outline-none resize-none leading-relaxed p-1 border-none shadow-none font-normal"
                />

                <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                        <LemonSelect
                            value={selectedBotId}
                            onChange={(val) => {
                                if (val) handleBotChange(val)
                            }}
                            options={botSelectOptions}
                            size="xsmall"
                            type="tertiary"
                            dropdownPlacement="top-start"
                            dropdownMatchSelectWidth={false}
                        />
                        {contentLength > 0 && (
                            <LemonTag type="completion" size="small" className="text-[10px] truncate max-w-[120px] opacity-60">
                                {contentLength} chars
                            </LemonTag>
                        )}
                    </div>

                    <div className="shrink-0">
                        <LemonButton
                            size="xsmall"
                            type="primary"
                            icon={<IconArrowRight />}
                            onClick={() => void sendPrompt()}
                            disabled={isGenerating || !prompt.trim()}
                            tooltip={`Send to ${activeBot.name}`}
                            className="rounded-lg"
                        />
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <LemonDropdown
            overlay={overlay}
            visible={isOpen}
            onVisibilityChange={setIsOpen}
            closeOnClickInside={false}
            placement="bottom-end"
            fallbackPlacements={['bottom-start', 'top-end', 'top-start']}
            className={`notebook-app-scope ${isDark ? 'dark' : ''}`}
        >
            <LemonButton
                size="small"
                type="secondary"
                icon={<IconSparkles />}
                sideIcon={<IconChevronDown />}
                active={isOpen}
                tooltip="Open philosopher AI chat"
            >
                <span className="hidden sm:inline">Ask AI</span>
            </LemonButton>
        </LemonDropdown>
    )
}
