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
    IconRefresh,
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
    sender: 'user' | 'ai'
    text: string
    timestamp: string
    philosopherId?: string
    thought?: string
    thinkingStages?: ThinkingStageView[]
    latencyMs?: number
    hasTable?: boolean
}

const EDITORIAL_SUGGESTIONS = [
    { label: 'Comparison table', icon: <IconTable />, prompt: 'Convert this notebook data into a structured Markdown comparison table' },
    { label: 'Executive summary', icon: <IconSparkles />, prompt: 'Generate a concise Executive Summary with key takeaways for the top of this notebook' },
    { label: 'Polish & format', icon: <IconPencil />, prompt: 'Polish and format this notebook into clean Markdown with proper headers and bullet points' },
    { label: 'Extract tasks', icon: <IconList />, prompt: 'Extract an Actionable Task List (To-Do items) from this notebook' },
    { label: 'Translate to Turkish', icon: <IconSparkles />, prompt: 'Translate the entire notebook content into Turkish keeping all formatting' },
    { label: 'Rewrite rigorously', icon: <IconPencil />, prompt: 'Rewrite & refactor this notebook in a more rigorous and persuasive tone' },
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
    'w-[min(100vw-1.5rem,28rem)] sm:w-[36rem] max-h-[min(78dvh,40rem)] p-3 space-y-3 text-xs overflow-y-auto overscroll-contain'

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

    const overlay = (
        <div className={panelClassName} onClick={(e) => e.stopPropagation()}>
            {/* Header with Context Indicator */}
            <div className="flex items-center justify-between border-b border-border pb-2 gap-2">
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
                        {EDITORIAL_SUGGESTIONS.map((item) => (
                            <LemonButton
                                key={item.label}
                                size="xsmall"
                                type="secondary"
                                icon={item.icon}
                                onClick={() => void sendPrompt(item.prompt)}
                                className="justify-start text-left truncate"
                            >
                                <span className="truncate">{item.label}</span>
                            </LemonButton>
                        ))}
                    </div>
                </div>
            )}

            {hasThread && (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {messages.map((msg) => {
                        const bot =
                            msg.sender === 'ai' && msg.philosopherId
                                ? getPhilosopherBot(msg.philosopherId, roster)
                                : activeBot
                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-2.5 items-start p-1.5 rounded hover:bg-surface-secondary transition-colors ${
                                    msg.sender === 'user' ? 'flex-row-reverse' : ''
                                }`}
                            >
                                <ProfilePicture
                                    user={msg.sender === 'ai' ? philosopherAsUser(bot) : undefined}
                                    name={msg.sender === 'user' ? 'You' : undefined}
                                    size="sm"
                                />
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="font-semibold text-primary truncate">
                                            {msg.sender === 'ai' ? bot.name : 'You'}
                                        </span>
                                        <span className="text-[10px] text-muted shrink-0">{msg.timestamp}</span>
                                    </div>

                                    {msg.sender === 'ai' && (msg.thinkingStages?.length || msg.thought) && (
                                        <ReasoningAnswer
                                            id={`${msg.id}-thought`}
                                            completed
                                            content={msg.thought || ''}
                                            stages={msg.thinkingStages}
                                            latencyMs={msg.latencyMs}
                                        />
                                    )}

                                    <p className="text-secondary leading-snug whitespace-pre-wrap mb-0">{msg.text}</p>

                                    {msg.sender === 'ai' && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/40 mt-1.5">
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
                                                icon={<IconRefresh />}
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
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {isGenerating && (
                        <div className="flex gap-2.5 items-start p-1.5">
                            <ProfilePicture user={philosopherAsUser(activeBot)} size="sm" />
                            <div className="flex-1 min-w-0 space-y-1">
                                <span className="font-semibold text-primary">{activeBot.name}</span>
                                <ReasoningAnswer id="live-thinking" completed={false} />
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            )}

            {/* Composer Bar */}
            <div className="border-t border-border pt-2 space-y-2">
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
                    className="w-full bg-surface-secondary border border-border rounded p-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-border resize-none leading-relaxed"
                />

                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 max-w-[55%]">
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
                            className="w-full"
                        />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted text-[10px] hidden sm:inline">Cmd + Enter</span>
                        <LemonButton
                            size="small"
                            type="primary"
                            icon={<IconArrowRight />}
                            onClick={() => void sendPrompt()}
                            disabled={isGenerating || !prompt.trim()}
                            tooltip={`Send to ${activeBot.name}`}
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
            padded={false}
            placement="bottom-end"
            fallbackPlacements={['bottom-start', 'top-end', 'top-start']}
            className={`notebook-app-scope ${isDark ? 'dark' : ''}`}
        >
            <LemonButton
                size="small"
                type="secondary"
                icon={<IconSparkles />}
                // No custom size classes — LemonButton__icon sets icon size like the other toolbar buttons
                sideIcon={<IconChevronDown />}
                active={isOpen}
                tooltip="Open philosopher AI chat"
            >
                <span className="hidden sm:inline">Ask AI</span>
            </LemonButton>
        </LemonDropdown>
    )
}
