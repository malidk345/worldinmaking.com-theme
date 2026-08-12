import { useState, useRef, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
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
import Markdown from 'components/Markdown'

const Mermaid = dynamic(() => import('components/Mermaid'), { ssr: false })


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

function shouldShowInsertButton(msg: ChatMessage, allMessages: ChatMessage[]): boolean {
    if (msg.hasTable) return true
    if (msg.text.includes('```mermaid') || msg.text.includes('```')) return true

    const msgIdx = allMessages.findIndex((m) => m.id === msg.id)
    const userPrompt = msgIdx > 0 ? allMessages[msgIdx - 1]?.text || '' : ''

    const intentKeywords = [
        'insert', 'notebook', 'table', 'diagram', 'chart', 'schema', 'summary',
        'list', 'note', 'write', 'generate', 'create', 'tablo', 'şema', 'ekle',
        'özet', 'liste', 'kod', 'hazırla', 'döküman', 'dokuman', 'çıkar', 'cikar',
    ]

    const combined = (userPrompt + ' ' + msg.text).toLowerCase()
    return intentKeywords.some((kw) => combined.includes(kw))
}

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

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal

        let accumulatedReply = ''

        try {
            // Feature 1: Live SSE Token Streaming via /api/notebook/co-author
            const sseRes = await fetch('/api/notebook/co-author', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal,
                body: JSON.stringify({
                    botName: activeBot.name,
                    mode: 'critique',
                    documentText: currentNotebookContent?.slice(0, 4000) || '',
                    nodeContent: text,
                }),
            })

            let lastRenderedLength = 0

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

                                // Extract real dynamic thinking stages (<perceive>, <frame>, <tension>, <move>) from LLM stream
                                let liveStages: ThinkingStageView[] | undefined = undefined
                                const thinkMatch = accumulatedReply.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/i)
                                if (thinkMatch) {
                                    const thinkBody = thinkMatch[1]
                                    const p = (thinkBody.match(/<perceive>([\s\S]*?)(?:<\/perceive>|$)/i) || [])[1]?.trim()
                                    const f = (thinkBody.match(/<frame>([\s\S]*?)(?:<\/frame>|$)/i) || [])[1]?.trim()
                                    const t = (thinkBody.match(/<tension>([\s\S]*?)(?:<\/tension>|$)/i) || [])[1]?.trim()
                                    const m = (thinkBody.match(/<move>([\s\S]*?)(?:<\/move>|$)/i) || [])[1]?.trim()

                                    const extracted: ThinkingStageView[] = []
                                    if (p) extracted.push({ id: 'perceive', label: 'Perceive', text: p })
                                    if (f) extracted.push({ id: 'frame', label: 'Frame', text: f })
                                    if (t) extracted.push({ id: 'tension', label: 'Tension', text: t })
                                    if (m) extracted.push({ id: 'move', label: 'Move', text: m })

                                    if (extracted.length > 0) {
                                        liveStages = extracted
                                    }
                                }

                                const currentCleanText = accumulatedReply.replace(/<thinking>[\s\S]*?(?:<\/thinking>|$)/gi, '').trim()

                                // Single-pass typewriter: advance 3 characters per step at 2ms for ultra-fast, smooth, flicker-free typing
                                while (lastRenderedLength < currentCleanText.length) {
                                    lastRenderedLength = Math.min(currentCleanText.length, lastRenderedLength + 3)
                                    const charSlice = currentCleanText.slice(0, lastRenderedLength)
                                    setMessages((prev) =>
                                        prev.map((msgItem) =>
                                            msgItem.id === aiMsgId
                                                ? {
                                                      ...msgItem,
                                                      text: charSlice,
                                                      thinkingStages: liveStages || msgItem.thinkingStages,
                                                  }
                                                : msgItem
                                        )
                                    )
                                    await new Promise((r) => setTimeout(r, 2))
                                }
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

            // Parse real dynamic thoughts from LLM output (<thinking> tags or responseData.thinking)
            let finalCleanText = accumulatedReply
            let realThinkingStages: ThinkingStageView[] | undefined = undefined

            const thinkMatch = accumulatedReply.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/i)
            if (thinkMatch) {
                const thinkBody = thinkMatch[1]
                const p = (thinkBody.match(/<perceive>([\s\S]*?)(?:<\/perceive>|$)/i) || [])[1]?.trim()
                const f = (thinkBody.match(/<frame>([\s\S]*?)(?:<\/frame>|$)/i) || [])[1]?.trim()
                const t = (thinkBody.match(/<tension>([\s\S]*?)(?:<\/tension>|$)/i) || [])[1]?.trim()
                const m = (thinkBody.match(/<move>([\s\S]*?)(?:<\/move>|$)/i) || [])[1]?.trim()

                const extracted: ThinkingStageView[] = []
                if (p) extracted.push({ id: 'perceive', label: 'Perceive', text: p })
                if (f) extracted.push({ id: 'frame', label: 'Frame', text: f })
                if (t) extracted.push({ id: 'tension', label: 'Tension', text: t })
                if (m) extracted.push({ id: 'move', label: 'Move', text: m })

                if (extracted.length > 0) {
                    realThinkingStages = extracted
                }
                finalCleanText = accumulatedReply.replace(/<thinking>[\s\S]*?(?:<\/thinking>|$)/gi, '').trim()
            } else if (responseData?.thinking?.stages?.length > 0) {
                realThinkingStages = responseData.thinking.stages.map((s: any) => ({
                    id: s.id,
                    label: s.label || s.id,
                    text: s.text,
                }))
            }

            const rawThought = responseData?.thought || (realThinkingStages ? realThinkingStages.map((s) => s.text).join('\n') : '')
            const fallbackSteps = rawThought
                ? rawThought
                      .split(/\n+|\.\s+/)
                      .map((s: string) => s.replace(/^[-*•\d.]+\s*/, '').trim())
                      .filter((s: string) => s.length > 5)
                : [
                      `Analyzing query through ${activeBot.name}'s stance`,
                      'Evaluating structural trade-offs & context',
                      'Formulating synthesis response',
                  ]

            const thinkingStages: ThinkingStageView[] = realThinkingStages || [
                { id: 'perceive', label: 'Perceive', text: fallbackSteps[0] || `Analyzing query through ${activeBot.name}'s stance` },
                { id: 'frame', label: 'Frame', text: fallbackSteps[1] || 'Evaluating structural trade-offs & context' },
                { id: 'tension', label: 'Tension', text: fallbackSteps[2] || 'Formulating synthesis response' },
                { id: 'move', label: 'Move', text: fallbackSteps[3] || 'Preparing actions' },
            ]

            const generatedSuggestions = [
                'Deconstruct primary premises',
                'Formulate counter-argument',
                'Synthesize dialectical resolution',
            ]

            // Fast completion advance for any remaining characters
            while (lastRenderedLength < finalCleanText.length) {
                lastRenderedLength = Math.min(finalCleanText.length, lastRenderedLength + 4)
                const charSlice = finalCleanText.slice(0, lastRenderedLength)
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === aiMsgId
                            ? {
                                  ...m,
                                  text: charSlice,
                                  thinkingStages: thinkingStages,
                              }
                            : m
                    )
                )
                await new Promise((r) => setTimeout(r, 2))
            }

            // Final completion update
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === aiMsgId
                        ? {
                              ...m,
                              text: finalCleanText,
                              isStreaming: false,
                              hasTable: containsTable,
                              osAction: detectedAction,
                              thought: rawThought,
                              thinkingStages: thinkingStages,
                              reasoningSteps: thinkingStages.map((s) => s.text),
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
    const abortControllerRef = useRef<AbortController | null>(null)

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
        if (!isOpen) {
            abortControllerRef.current?.abort()
            return
        }
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                const target = event.target as HTMLElement
                if (
                    target.closest?.('[data-radix-popper-content-wrapper]') ||
                    target.closest?.('[role="menu"]') ||
                    target.closest?.('[role="listbox"]') ||
                    target.closest?.('[data-lemon-popover]') ||
                    target.closest?.('.LemonMenu') ||
                    target.closest?.('.LemonSelect') ||
                    target.closest?.('.LemonSelect__dropdown') ||
                    target.closest?.('.LemonDropdown__overlay') ||
                    target.closest?.('.Popover') ||
                    target.closest?.('.LemonButton')
                ) {
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
            abortControllerRef.current?.abort()
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
                            className={`fixed w-[min(100vw-1rem,26rem)] sm:w-[32rem] bg-[#FCFCFB] text-[#1F1E1B] border border-[#E5E2D9] rounded-2xl shadow-2xl z-50 flex flex-col font-sans overflow-hidden antialiased selection:bg-[#1E3A8A]/15 selection:text-[#1E3A8A] notebook-app-scope ${isDark ? 'dark bg-stone-900 text-stone-100 border-stone-800' : ''}`}
                        >
                            <div className="h-full flex flex-col min-h-0 relative">
                                {/* Top Header Bar - Claude Workspace Style with Philosopher Roster */}
                                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#E5E2D9]/80 bg-[#FCFCFB]/90 backdrop-blur-md flex-shrink-0 select-none">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {/* Philosopher Roster Select */}
                                        <LemonSelect
                                            value={selectedBotId}
                                            onChange={(val) => {
                                                if (val) handleBotChange(val)
                                            }}
                                            options={botSelectOptions}
                                            size="small"
                                            type="tertiary"
                                            dropdownPlacement="bottom-start"
                                            dropdownMatchSelectWidth={false}
                                        />

                                        {contentLength > 0 && (
                                            <LemonTag type="completion" size="small" className="text-[10px] shrink-0 font-mono">
                                                @ Context ({contentLength})
                                            </LemonTag>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {hasThread && (
                                            <LemonButton
                                                size="xsmall"
                                                type="tertiary"
                                                icon={<IconTrash />}
                                                onClick={() => setMessages([])}
                                                tooltip="Sohbeti Temizle"
                                            >
                                                Temizle
                                            </LemonButton>
                                        )}
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-1 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                                            title="Paneli Kapat"
                                        >
                                            <IconX className="size-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Body - Scrollable content */}
                                <div className="flex-1 overflow-y-auto p-3.5 space-y-4 min-h-0 relative">
                                    {!hasThread && (
                                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-4 max-w-md mx-auto space-y-4 select-none">
                                            {/* Claude Spark Orb Icon in Navy Blue */}
                                            <div className="flex items-center justify-center text-[#1E3A8A]">
                                                <svg
                                                    viewBox="0 0 100 100"
                                                    className="w-12 h-12"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <circle cx="50" cy="50" r="30" fill="#1E3A8A" opacity="0.15" />
                                                    <circle cx="50" cy="50" r="20" fill="#1E3A8A" />
                                                    <path d="M50 25 L53 45 L73 45 L57 56 L63 75 L50 63 L37 75 L43 56 L27 45 L47 45 Z" fill="#FFFFFF" />
                                                </svg>
                                            </div>

                                            <div className="space-y-1">
                                                <h3 className="text-base font-serif font-semibold text-stone-900 tracking-tight">
                                                    Dünya Yapım Aşaması — Filozof Danışmanı
                                                </h3>
                                                <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                                                    Not defteri içeriklerinizi gerçek zamanlı olarak dönüştürün, felsefi yapısökümden geçirin veya analiz edin.
                                                </p>
                                            </div>

                                            {/* Editorial Action Chips */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
                                                {EDITORIAL_SUGGESTIONS.map((item) => {
                                                    const IconComp = item.icon
                                                    return (
                                                        <LemonButton
                                                            key={item.label}
                                                            size="small"
                                                            type="secondary"
                                                            icon={<IconComp />}
                                                            onClick={() => void sendPrompt(item.prompt)}
                                                            className="justify-start text-left truncate rounded-xl border border-stone-200 bg-white hover:bg-stone-50 shadow-2xs"
                                                        >
                                                            <span className="truncate text-xs font-medium text-stone-800">{item.label}</span>
                                                        </LemonButton>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {hasThread && (
                                        <div className="space-y-4 pb-4">
                                            {messages.map((msg) => {
                                                const bot =
                                                    msg.sender === 'ai' && msg.philosopherId
                                                        ? getPhilosopherBot(msg.philosopherId, roster)
                                                        : activeBot

                                                if (msg.sender === 'system') {
                                                    return (
                                                        <div key={msg.id} className="flex justify-center my-2 select-none">
                                                            <div className="flex items-center gap-1.5 text-[11px] text-stone-500 bg-stone-100 border border-stone-200 rounded-full px-3 py-0.5 shadow-2xs font-mono">
                                                                <span>🔀</span>
                                                                <span>{msg.text}</span>
                                                            </div>
                                                        </div>
                                                    )
                                                }

                                                if (msg.sender === 'user') {
                                                    return (
                                                        <div key={msg.id} className="flex justify-end my-2">
                                                            <div className="max-w-[88%] bg-[#1E3A8A] text-white rounded-2xl px-4 py-2.5 text-xs leading-relaxed font-normal shadow-sm">
                                                                {msg.text}
                                                            </div>
                                                        </div>
                                                    )
                                                }

                                                const hasText = !!msg.text && msg.text.trim().length > 0

                                                return (
                                                    <div key={msg.id} className="space-y-2.5 my-3 min-w-0">
                                                        {msg.sender === 'ai' && (
                                                            <div className="px-1">
                                                                <ReasoningAnswer
                                                                    id={`${msg.id}-thought`}
                                                                    completed={hasText || !msg.isStreaming}
                                                                    content={msg.thought || ''}
                                                                    stages={msg.thinkingStages}
                                                                    latencyMs={msg.latencyMs}
                                                                />
                                                            </div>
                                                        )}

                                                        {(hasText || (!msg.isStreaming && !msg.thinkingStages?.length)) && (
                                                            <div className="bg-white border border-[#E5E2D9] rounded-2xl p-3.5 space-y-2.5 shadow-sm">
                                                                <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                                                                    <ProfilePicture user={philosopherAsUser(bot)} size="sm" />
                                                                    <div className="flex justify-between items-center gap-2 min-w-0 flex-1">
                                                                        <span className="font-semibold text-xs text-stone-900 truncate">{bot.displayName || bot.name}</span>
                                                                        <span className="text-[10px] text-stone-400 shrink-0 font-mono">{msg.timestamp}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="text-stone-800 text-xs leading-relaxed mb-0 [&>p]:mb-1.5 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>code]:bg-stone-100 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:font-mono">
                                                                    <Markdown
                                                                        components={{
                                                                            code: ({ className, children, inline, ...props }: any) => {
                                                                                const codeStr = String(children || '').replace(/\n$/, '')
                                                                                const match = /language-(\w+)/.exec(className || '')
                                                                                const isMermaid =
                                                                                    (match && match[1] === 'mermaid') ||
                                                                                    codeStr.startsWith('graph ') ||
                                                                                    codeStr.startsWith('flowchart') ||
                                                                                    codeStr.startsWith('sequenceDiagram') ||
                                                                                    codeStr.startsWith('gantt') ||
                                                                                    codeStr.startsWith('pie') ||
                                                                                    codeStr.startsWith('classDiagram')

                                                                                if (isMermaid) {
                                                                                    return (
                                                                                        <div className="my-2 p-2 rounded-xl border border-stone-200 bg-stone-50 shadow-2xs overflow-hidden">
                                                                                            <Mermaid>{codeStr}</Mermaid>
                                                                                        </div>
                                                                                    )
                                                                                }

                                                                                if (inline) {
                                                                                    return (
                                                                                        <code className="bg-stone-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-stone-900" {...props}>
                                                                                            {children}
                                                                                        </code>
                                                                                    )
                                                                                }

                                                                                return (
                                                                                    <div className="my-2 rounded-xl border border-stone-200 bg-stone-900 p-3 overflow-x-auto font-mono text-[11px] leading-normal text-emerald-300 shadow-2xs">
                                                                                        <code className={className} {...props}>
                                                                                            {children}
                                                                                        </code>
                                                                                    </div>
                                                                                )
                                                                            },
                                                                            table: ({ children }: any) => (
                                                                                <div className="my-2.5 w-full overflow-x-auto rounded-xl border border-stone-200 shadow-2xs">
                                                                                    <table className="w-full text-xs border-collapse min-w-full divide-y divide-stone-200">
                                                                                        {children}
                                                                                    </table>
                                                                                </div>
                                                                            ),
                                                                            thead: ({ children }: any) => (
                                                                                <thead className="bg-stone-50 border-b border-stone-200 text-stone-900 font-semibold">
                                                                                    {children}
                                                                                </thead>
                                                                            ),
                                                                            tbody: ({ children }: any) => (
                                                                                <tbody className="divide-y divide-stone-100 bg-white">
                                                                                    {children}
                                                                                </tbody>
                                                                            ),
                                                                            tr: ({ children }: any) => (
                                                                                <tr className="hover:bg-stone-50 transition-colors">
                                                                                    {children}
                                                                                </tr>
                                                                            ),
                                                                            th: ({ children }: any) => (
                                                                                <th className="px-3 py-2 text-left font-semibold text-xs text-stone-900 border-r border-stone-200/60 last:border-r-0">
                                                                                    {children}
                                                                                </th>
                                                                            ),
                                                                            td: ({ children }: any) => (
                                                                                <td className="px-3 py-2 text-left text-xs text-stone-700 border-r border-stone-200/40 last:border-r-0">
                                                                                    {children}
                                                                                </td>
                                                                            ),
                                                                            blockquote: ({ children }: any) => (
                                                                                <blockquote className="border-l-2 border-[#1E3A8A] pl-3 my-2 text-stone-600 italic text-xs">
                                                                                    {children}
                                                                                </blockquote>
                                                                            ),
                                                                        }}
                                                                    >
                                                                        {msg.text || ''}
                                                                    </Markdown>
                                                                    {msg.isStreaming && (
                                                                        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[#1E3A8A] align-middle opacity-80 shrink-0 animate-pulse" />
                                                                    )}
                                                                </div>

                                                                {msg.osAction && (
                                                                    <div className="mt-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200 shadow-2xs space-y-1.5">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <IconSparkles className="size-4 text-amber-600 shrink-0" />
                                                                                <div className="min-w-0">
                                                                                    <span className="font-semibold text-xs text-stone-900 block truncate">
                                                                                        {msg.osAction.title}
                                                                                    </span>
                                                                                    <span className="text-[10px] text-stone-500 block truncate">
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
                                                            </div>
                                                        )}

                                                        {/* Contextual Insert Button */}
                                                        {shouldShowInsertButton(msg, messages) && (
                                                            <div className="pt-1 px-1 flex justify-start">
                                                                <LemonButton
                                                                    size="xsmall"
                                                                    type="secondary"
                                                                    icon={msg.hasTable ? <IconTable /> : <IconPlus />}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        if (onInsertPromptBlock) onInsertPromptBlock(msg.text, 'append')
                                                                        setIsOpen(false)
                                                                    }}
                                                                    tooltip="İçeriği aktif not defterine aktar"
                                                                    className="rounded-xl border border-stone-200 shadow-2xs"
                                                                >
                                                                    {msg.hasTable ? 'Tabloyu Not Defterine Ekle' : 'Not Defterine Ekle'}
                                                                </LemonButton>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}

                                            <div ref={chatEndRef} />
                                        </div>
                                    )}
                                </div>

                                {/* Footer - Floating Capsule Input Area */}
                                <div className="p-3 border-t border-[#E5E2D9] bg-[#FCFCFB] flex-shrink-0">
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault()
                                            if (prompt.trim() && !isGenerating) void sendPrompt()
                                        }}
                                        className="w-full"
                                    >
                                        <div className="relative rounded-[20px] border border-[#E5E2D9] bg-white p-3 shadow-md focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A]/30 transition-all">
                                            {contentLength > 0 && (
                                                <div className="flex items-center gap-1.5 pb-1.5 px-0.5">
                                                    <LemonTag type="completion" size="small" className="text-[10px] truncate max-w-[180px] font-mono">
                                                        @ Context ({contentLength} chars)
                                                    </LemonTag>
                                                </div>
                                            )}

                                            <LemonTextArea
                                                ref={textareaRef}
                                                value={prompt}
                                                onChange={(val) => setPrompt(val)}
                                                placeholder="Bir soru sorun veya filozofa danışın..."
                                                minRows={2}
                                                maxRows={5}
                                                className="!border-none !bg-transparent text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none resize-none leading-relaxed p-0 shadow-none font-normal"
                                                onPressEnter={() => {
                                                    if (prompt.trim() && !isGenerating) void sendPrompt()
                                                }}
                                            />

                                            <div className="flex items-center justify-between gap-1.5 pt-2 mt-1 border-t border-stone-100">
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
                                                        size="small"
                                                        type="primary"
                                                        htmlType="submit"
                                                        icon={<IconArrowRight />}
                                                        loading={isGenerating}
                                                        disabled={!prompt.trim()}
                                                        tooltip={`${activeBot.name}'e Gönder`}
                                                        className="rounded-xl !bg-[#1E3A8A] hover:!bg-[#1e40af] !text-white border-none shadow-2xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
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
