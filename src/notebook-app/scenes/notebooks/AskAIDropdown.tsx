import { useState, useRef, useEffect, useMemo } from 'react'
import * as Portal from '@radix-ui/react-portal'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../../../context/App'
import {
    LemonDropdown,
    LemonButton,
    LemonSelect,
    LemonTag,
    LemonTextArea,
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
    IconX,
    IconCheck,
} from '@posthog/icons'
import {
    PHILOSOPHER_BOTS,
    getPhilosopherBot,
    philosopherAsUser,
    fetchPhilosopherRosterWithAvatars,
    type PhilosopherBot,
} from '~nb-lib/philosophers'
import { createNotebook } from './notebookStorage'
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

export interface OSActionCard {
    type: 'create_notebook' | 'create_forum_topic' | 'open_window'
    title: string
    description: string
    payload: {
        title?: string
        content?: string
        path?: string
    }
    executed?: boolean
}

export interface ChatMessage {
    id: string
    sender: 'user' | 'ai' | 'system'
    text: string
    timestamp: string
    philosopherId?: string
    thought?: string
    thinkingStages?: ThinkingStageView[]
    reasoningSteps?: string[]
    suggestions?: string[]
    latencyMs?: number
    hasTable?: boolean
    isStreaming?: boolean
    osAction?: OSActionCard
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
    'w-[min(100vw-1.5rem,22.5rem)] sm:w-[28.5rem] max-h-[min(78dvh,40rem)] p-3 space-y-3 text-xs overflow-y-auto overscroll-contain bg-[var(--color-bg-surface-secondary)]'

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

    const [reasoningExpanded, setReasoningExpanded] = useState<Record<string, boolean>>({})

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

    const executeOSAction = (msgId: string, action: OSActionCard) => {
        try {
            if (action.type === 'create_notebook') {
                createNotebook(action.payload.title || 'AI Generated Notes', action.payload.content || '')
                if (addWindow) {
                    addWindow({ path: '/notebooks' })
                }
            } else if (action.type === 'create_forum_topic') {
                if (addWindow) {
                    addWindow({ path: '/community' })
                }
            } else if (action.type === 'open_window') {
                if (addWindow && action.payload.path) {
                    addWindow({ path: action.payload.path })
                }
            }

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === msgId && m.osAction
                        ? { ...m, osAction: { ...m.osAction, executed: true } }
                        : m
                )
            )
        } catch (e) {
            console.warn('[Ask AI] Action execution error:', e)
        }
    }

    const sendPrompt = async (raw?: string) => {
        const text = (raw ?? prompt).trim()
        if (!text || isGenerating) return

        const userMsg: ChatMessage = {
            id: `${Date.now()}-u`,
            sender: 'user',
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }

        const initialReasoningSteps = [
            `Deconstructing premises from ${activeBot.name}'s stance`,
            'Analyzing ideological contradictions & structural trade-offs',
            'Formulating persona critique & dialectical resolution',
        ]

        const initialThinkingStages = [
            { id: 'perceive', label: 'Perceive', text: `Perceiving query through ${activeBot.name}'s lens...` },
            { id: 'frame', label: 'Frame', text: `Framing epistemic stance & workspace context...` },
            { id: 'tension', label: 'Tension', text: `Analyzing structural tensions & dialectical trade-offs...` },
            { id: 'move', label: 'Move', text: `Formulating synthesis response & executable actions...` },
        ]

        const aiMsgId = `${Date.now()}-a`
        const placeholderAiMsg: ChatMessage = {
            id: aiMsgId,
            sender: 'ai',
            text: '',
            isStreaming: true,
            philosopherId: activeBot.id,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            thinkingStages: initialThinkingStages,
            reasoningSteps: initialReasoningSteps,
        }

        setMessages((prev) => [...prev, userMsg, placeholderAiMsg])
        setPrompt('')
        setIsGenerating(true)

        let accumulatedReply = ''

        try {
            // Feature 1: Live SSE Token Streaming via /api/notebook/co-author
            const sseRes = await fetch('/api/notebook/co-author', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    botName: activeBot.name,
                    mode: 'critique',
                    documentText: currentNotebookContent?.slice(0, 4000) || '',
                    nodeContent: text,
                }),
            })

            if (sseRes.ok && sseRes.body) {
                const reader = sseRes.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        const cleanLine = line.replace(/^data:\s*/, '').trim()
                        if (!cleanLine) continue

                        try {
                            const parsed = JSON.parse(cleanLine)
                            if (parsed.token) {
                                accumulatedReply += parsed.token
                                setMessages((prev) =>
                                    prev.map((m) =>
                                        m.id === aiMsgId ? { ...m, text: accumulatedReply } : m
                                    )
                                )
                                await new Promise((r) => setTimeout(r, 25))
                            }
                        } catch {
                            /* ignore malformed chunk */
                        }
                    }
                }
            }

            let responseData: any = null
            // Fallback to non-streaming /api/bots/act if SSE stream returned empty
            if (!accumulatedReply.trim()) {
                const notebookContextSnippet = currentNotebookContent?.trim()
                    ? `[NOTEBOOK CONTENT CONTEXT]\n"""\n${currentNotebookContent.slice(0, 4000)}\n"""\n`
                    : ''

                let res = await fetch('/api/bots/act', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'chat',
                        bot: activeBot.id,
                        question: `${notebookContextSnippet}${text}`,
                        mood: 'calm',
                        taskType: 'paper_section',
                    }),
                })

                if (res.status === 404 || res.status === 405) {
                    res = await fetch('/api/philosopher-bot', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            philosopher: activeBot.id,
                            question: `${notebookContextSnippet}${text}`,
                            mood: 'calm',
                            taskType: 'paper_section',
                        }),
                    })
                }

                responseData = await res.json().catch(() => null)
                accumulatedReply =
                    (typeof responseData?.reply === 'string' && responseData.reply.trim()) ||
                    `Response received for: "${text}"`
            }

            // Feature 5: OS Intent Recognition & Executable Action Cards
            const lowerText = (text + ' ' + accumulatedReply).toLowerCase()
            let detectedAction: OSActionCard | undefined = undefined

            if (lowerText.includes('create notebook') || lowerText.includes('new notebook') || text.startsWith('/notebook')) {
                const titleMatch = text.match(/(?:notebook|on|about)\s+([a-zA-Z0-9\s]+)/i)
                const title = titleMatch ? titleMatch[1].trim() : 'AI Generated Notes'
                detectedAction = {
                    type: 'create_notebook',
                    title: `Create Notebook: "${title}"`,
                    description: 'Save and open a new workspace notebook',
                    payload: { title, content: accumulatedReply },
                }
            } else if (lowerText.includes('forum topic') || lowerText.includes('start debate') || lowerText.includes('community post')) {
                detectedAction = {
                    type: 'create_forum_topic',
                    title: `Start Forum Topic: "${text.slice(0, 30)}..."`,
                    description: 'Publish thread to community forum',
                    payload: { title: text, content: accumulatedReply },
                }
            } else if (lowerText.includes('open admin') || lowerText.includes('dashboard')) {
                detectedAction = {
                    type: 'open_window',
                    title: 'Open Admin OS Dashboard',
                    description: 'Navigate to system moderation dashboard',
                    payload: { path: '/admin' },
                }
            }

            const containsTable = accumulatedReply.includes('|') && accumulatedReply.includes('---')

            const rawThought = responseData?.thought || ''
            const parsedReasoningSteps = rawThought
                ? rawThought
                      .split(/\n+|\.\s+/)
                      .map((s: string) => s.replace(/^[-*•\d.]+\s*/, '').trim())
                      .filter((s: string) => s.length > 5)
                : [
                      `Deconstructing query through ${activeBot.name}'s stance`,
                      'Analyzing structural assumptions & technological enframing',
                      'Formulating persona critique & dialectical resolution',
                  ]

            const thinkingStages = [
                { id: 'perceive', label: 'Perceive', text: parsedReasoningSteps[0] || `Perceiving query through ${activeBot.name}'s stance...` },
                { id: 'frame', label: 'Frame', text: parsedReasoningSteps[1] || 'Framing epistemic stance & workspace context...' },
                { id: 'tension', label: 'Tension', text: parsedReasoningSteps[2] || 'Analyzing structural tensions & trade-offs...' },
                { id: 'move', label: 'Move', text: parsedReasoningSteps[3] || 'Formulating synthesis response & workspace actions...' },
            ]

            const generatedSuggestions = [
                'Deconstruct primary premises',
                'Formulate counter-argument',
                'Synthesize dialectical resolution',
            ]

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === aiMsgId
                        ? {
                              ...m,
                              text: accumulatedReply,
                              isStreaming: false,
                              hasTable: containsTable,
                              osAction: detectedAction,
                              thought: rawThought || parsedReasoningSteps.join('\n'),
                              thinkingStages,
                              reasoningSteps: parsedReasoningSteps,
                              suggestions: generatedSuggestions,
                          }
                        : m
                )
            )
        } catch (error) {
            console.warn('[Ask AI] error:', error)
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === aiMsgId
                        ? {
                              ...m,
                              text: 'The philosopher network is unreachable right now. Please try again.',
                              isStreaming: false,
                          }
                        : m
                )
            )
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

    const app = useApp()
    const taskbarRef = app?.taskbarRef
    const panelRef = useRef<HTMLDivElement | null>(null)

    const taskbarRect = taskbarRef?.current?.getBoundingClientRect()
    const padding = taskbarRect?.left ?? 8
    const panelStyle =
        typeof window === 'undefined'
            ? undefined
            : {
                  top: padding,
                  right: padding,
                  height: window.innerHeight - padding - (taskbarRect?.top ?? padding),
              }

    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                const target = event.target as HTMLElement
                if (target.closest?.('[data-lemon-popover]') || target.closest?.('.LemonSelect__dropdown')) {
                    return
                }
                setIsOpen(false)
            }
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen])

    return (
        <>
            <LemonButton
                size="small"
                type="secondary"
                icon={<IconSparkles />}
                sideIcon={<IconChevronDown />}
                active={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                tooltip="Open philosopher AI chat panel"
            >
                <span className="hidden sm:inline">Ask AI</span>
            </LemonButton>

            <Portal.Root>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={panelRef}
                            data-scheme="primary"
                            initial={{ translateX: '100%' }}
                            animate={{ translateX: 0 }}
                            exit={{ translateX: '100%' }}
                            transition={{ duration: 0.3, type: 'tween' }}
                            style={panelStyle}
                            className={`fixed w-96 max-w-[calc(100vw-1rem)] bg-primary border border-primary rounded shadow-xl z-50 text-primary flex flex-col notebook-app-scope ${isDark ? 'dark' : ''}`}
                        >
                            <div className="h-full flex flex-col min-h-0">
                                {/* Header - Identical to NotificationsPanel */}
                                <div className="flex items-center justify-between px-4 py-2 border-b border-primary flex-shrink-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <ProfilePicture user={philosopherAsUser(activeBot)} size="sm" />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-semibold text-sm truncate text-primary">
                                                    {activeBot.displayName}
                                                </span>
                                                {contentLength > 0 && (
                                                    <LemonTag type="completion" size="small" className="text-[9px]">
                                                        Context ({contentLength})
                                                    </LemonTag>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
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
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="text-sm text-secondary hover:text-primary p-1"
                                            title="Close AI Panel"
                                        >
                                            <IconX className="size-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Body - Scrollable content */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
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
                                                            onClick={() => void sendPrompt(item.prompt)}
                                                            className="justify-start text-left truncate"
                                                        >
                                                            <span className="truncate text-xs">{item.label}</span>
                                                        </LemonButton>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {hasThread && (
                                        <div className="space-y-3">
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
                                                            {/* 1:1 PostHog ReasoningAnswer Component — Multi-stage Thinking Pipeline */}
                                                            {msg.sender === 'ai' && (
                                                                <div className="px-1">
                                                                    <ReasoningAnswer
                                                                        id={`${msg.id}-thought`}
                                                                        completed={!msg.isStreaming}
                                                                        content={msg.thought || ''}
                                                                        stages={msg.thinkingStages}
                                                                        latencyMs={msg.latencyMs}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* AI Reply Card */}
                                                            <div className="bg-surface-primary border border-[var(--color-border-primary)] rounded-xl p-3 space-y-2 shadow-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <ProfilePicture user={philosopherAsUser(bot)} size="sm" />
                                                                    <div className="flex justify-between items-center gap-2 min-w-0 flex-1">
                                                                        <span className="font-semibold text-xs text-primary truncate">{bot.name}</span>
                                                                        <span className="text-[10px] text-muted shrink-0">{msg.timestamp}</span>
                                                                    </div>
                                                                </div>

                                                                <p className="text-primary text-xs leading-relaxed whitespace-pre-wrap mb-0">
                                                                    {msg.text}
                                                                    {msg.isStreaming && (
                                                                        <span className="inline-block w-1.5 h-3 ml-1 bg-amber-500 animate-pulse rounded-full align-middle" />
                                                                    )}
                                                                </p>

                                                                {/* Feature 5: Natural Language OS Executable Action Card */}
                                                                {msg.osAction && (
                                                                    <div className="mt-2.5 p-2.5 rounded-xl bg-surface-primary border border-[var(--color-border-primary)] shadow-2xs space-y-1.5">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <IconSparkles className="size-4 text-amber-500 shrink-0" />
                                                                                <div className="min-w-0">
                                                                                    <span className="font-semibold text-xs text-primary block truncate">
                                                                                        {msg.osAction.title}
                                                                                    </span>
                                                                                    <span className="text-[10px] text-muted block truncate">
                                                                                        {msg.osAction.description}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <LemonButton
                                                                                size="xsmall"
                                                                                type={msg.osAction.executed ? 'tertiary' : 'primary'}
                                                                                icon={msg.osAction.executed ? <IconCheck /> : <IconPlus />}
                                                                                disabled={msg.osAction.executed}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    executeOSAction(msg.id, msg.osAction!)
                                                                                }}
                                                                            >
                                                                                {msg.osAction.executed ? 'Executed' : 'Run Action'}
                                                                            </LemonButton>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
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

                                                                {/* PostHog AI Suggestions Thread Chips */}
                                                                {msg.sender === 'ai' && msg.suggestions && msg.suggestions.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-[var(--color-border-primary)]/50 mt-2">
                                                                        {msg.suggestions.map((sug, idx) => (
                                                                            <LemonButton
                                                                                key={idx}
                                                                                size="xsmall"
                                                                                type="tertiary"
                                                                                icon={<IconSparkles className="size-3 text-amber-500" />}
                                                                                onClick={() => sendPrompt(sug)}
                                                                            >
                                                                                {sug}
                                                                            </LemonButton>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                )
                                            })}

                                            <div ref={chatEndRef} />
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-2.5 border-t border-primary bg-primary flex-shrink-0 rounded-b">
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault()
                                            if (prompt.trim() && !isGenerating) void sendPrompt()
                                        }}
                                        className="w-full"
                                    >
                                        <label className="input-like flex flex-col cursor-text border border-primary bg-surface-primary rounded-xl p-2.5 space-y-2 shadow-xs transition-all focus-within:border-[var(--color-border-bold)]">
                                            {contentLength > 0 && (
                                                <div className="flex items-center gap-1.5 pt-0.5 px-0.5">
                                                    <LemonTag type="completion" size="small" className="text-[10px] truncate max-w-[160px]">
                                                        @ Context ({contentLength} chars)
                                                    </LemonTag>
                                                </div>
                                            )}

                                            <LemonTextArea
                                                ref={textareaRef}
                                                value={prompt}
                                                onChange={(val) => setPrompt(val)}
                                                placeholder="Ask follow-up or / for commands..."
                                                minRows={2}
                                                maxRows={5}
                                                className="!border-none !bg-transparent text-xs text-primary placeholder:text-muted focus:outline-none resize-none leading-relaxed p-0 shadow-none font-normal"
                                                onPressEnter={() => {
                                                    if (prompt.trim() && !isGenerating) void sendPrompt()
                                                }}
                                            />

                                            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[var(--color-border-primary)]">
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
                                                </div>

                                                <div className="shrink-0">
                                                    <LemonButton
                                                        size="xsmall"
                                                        type="primary"
                                                        htmlType="submit"
                                                        icon={<IconArrowRight />}
                                                        loading={isGenerating}
                                                        disabled={!prompt.trim()}
                                                        tooltip={`Send to ${activeBot.name}`}
                                                        className="rounded-lg"
                                                    />
                                                </div>
                                            </div>
                                        </label>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Portal.Root>
        </>
    )
}
