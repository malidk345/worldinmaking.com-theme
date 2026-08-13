import { useState, useRef, useEffect } from 'react'
import { type PhilosopherBot } from '~nb-lib/philosophers'
import type { ChatMessage, ThinkingStageView, OSActionCard } from '../types'
import { createNotebook } from '../../notebookStorage'
import { useApp } from '../../../../../context/App'
import { parseAiSseEvent } from 'lib/ai/contracts'

export interface UseAskAIChatOptions {
    activeBot: PhilosopherBot
    roster: PhilosopherBot[]
    currentNotebookContent?: string
}

export interface UseAskAIChatReturn {
    messages: ChatMessage[]
    isGenerating: boolean
    prompt: string
    setPrompt: (v: string) => void
    sendPrompt: (raw?: string) => Promise<void>
    clearMessages: () => void
    executeOSAction: (msgId: string, action: OSActionCard) => void
    textareaRef: React.RefObject<HTMLTextAreaElement | null>
    chatEndRef: React.RefObject<HTMLDivElement | null>
    abortControllerRef: React.RefObject<AbortController | null>
}

export function useAskAIChat({
    activeBot,
    roster,
    currentNotebookContent,
}: UseAskAIChatOptions): UseAskAIChatReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [prompt, setPrompt] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const chatEndRef = useRef<HTMLDivElement | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    const app = useApp()
    const addWindow = app?.addWindow

    // Auto-scroll to latest message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isGenerating])

    const clearMessages = () => setMessages([])

    const executeOSAction = (msgId: string, action: OSActionCard) => {
        try {
            if (action.type === 'create_notebook') {
                createNotebook(action.payload.title || 'AI Generated Notes', action.payload.content || '')
                if (addWindow) addWindow({ path: '/notebooks' })
            } else if (action.type === 'create_forum_topic') {
                if (addWindow) addWindow({ path: '/community' })
            } else if (action.type === 'open_window') {
                if (addWindow && action.payload.path) addWindow({ path: action.payload.path })
            }

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === msgId && m.osAction ? { ...m, osAction: { ...m.osAction, executed: true } } : m
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

        const aiMsgId = `${Date.now()}-a`
        const placeholderAiMsg: ChatMessage = {
            id: aiMsgId,
            sender: 'ai',
            text: '',
            isStreaming: true,
            philosopherId: activeBot.id,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            thinkingStages: [],
            reasoningSteps: [],
        }

        setMessages((prev) => [...prev, userMsg, placeholderAiMsg])
        setPrompt('')
        setIsGenerating(true)

        if (abortControllerRef.current) abortControllerRef.current.abort()
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal

        let accumulatedReply = ''
        let lastRenderedLength = 0
        let streamedThinkingStages: ThinkingStageView[] = []

        try {
            // ── Primary: SSE streaming via /api/notebook/co-author ──────────────
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
                         const parsed = parseAiSseEvent(line)
                         if (!parsed) continue

                         if (parsed.type === 'thinking_step') {
                             const stage: ThinkingStageView = {
                                 id: parsed.step.id,
                                 label: parsed.step.title,
                                 text: parsed.step.detail,
                             }
                             streamedThinkingStages = [...streamedThinkingStages, stage]
                             setMessages((prev) => prev.map((msgItem) =>
                                 msgItem.id === aiMsgId
                                     ? { ...msgItem, thinkingStages: [...(msgItem.thinkingStages || []), stage] }
                                     : msgItem
                             ))
                         } else if (parsed.type === 'token') {
                             accumulatedReply += parsed.text
                             while (lastRenderedLength < accumulatedReply.length) {
                                 lastRenderedLength = Math.min(accumulatedReply.length, lastRenderedLength + 3)
                                 const charSlice = accumulatedReply.slice(0, lastRenderedLength)
                                 setMessages((prev) => prev.map((msgItem) =>
                                     msgItem.id === aiMsgId ? { ...msgItem, text: charSlice } : msgItem
                                 ))
                                 await new Promise((r) => setTimeout(r, 2))
                             }
                         } else if (parsed.type === 'done') {
                             accumulatedReply = parsed.fullText || accumulatedReply
                         }
                     }
                }
            }

            // ── Fallback: /api/bots/act → /api/philosopher-bot ──────────────────
            let responseData: any = null
            if (!accumulatedReply.trim()) {
                const notebookCtx = currentNotebookContent?.trim()
                    ? `[NOTEBOOK CONTENT CONTEXT]\n"""\n${currentNotebookContent.slice(0, 4000)}\n"""\n`
                    : ''

                let res = await fetch('/api/bots/act', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'chat',
                        bot: activeBot.id,
                         question: text.slice(0, 8000),
                         context: notebookCtx.slice(0, 12000),
                        mood: 'calm',
                         taskType: 'community_reply',
                    }),
                })

                if (res.status === 404 || res.status === 405) {
                    res = await fetch('/api/philosopher-bot', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            philosopher: activeBot.id,
                             question: text.slice(0, 8000),
                             context: notebookCtx.slice(0, 12000),
                            mood: 'calm',
                             taskType: 'community_reply',
                        }),
                    })
                }

                responseData = await res.json().catch(() => null)
                accumulatedReply =
                    (typeof responseData?.reply === 'string' && responseData.reply.trim()) ||
                     (typeof responseData?.error === 'string' && responseData.error) ||
                     'The AI service is unavailable right now.'
            }

            // ── OS Intent Detection ──────────────────────────────────────────────
            const lowerText = (text + ' ' + accumulatedReply).toLowerCase()
            let detectedAction: OSActionCard | undefined

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

            // ── Final safe analysis stages ───────────────────────────────────────
            const finalCleanText = accumulatedReply
                .replace(/<(?:analysis_summary|thinking|think)>[\s\S]*?(?:<\/(?:analysis_summary|thinking|think)>|$)/gi, '')
                .trim()

            let realThinkingStages: ThinkingStageView[] | undefined = streamedThinkingStages.length > 0
                ? streamedThinkingStages
                : undefined

            if (!realThinkingStages && responseData?.thinking?.stages?.length > 0) {
                realThinkingStages = responseData.thinking.stages.map((s: any) => ({
                    id: s.id,
                    label: s.label || s.id,
                    text: s.text,
                }))
            }

            const thinkingStages: ThinkingStageView[] = realThinkingStages || []

            const containsTable = finalCleanText.includes('|') && finalCleanText.includes('---')

            // Fast-complete any remaining typewriter chars
            while (lastRenderedLength < finalCleanText.length) {
                lastRenderedLength = Math.min(finalCleanText.length, lastRenderedLength + 4)
                const charSlice = finalCleanText.slice(0, lastRenderedLength)
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === aiMsgId ? { ...m, text: charSlice, thinkingStages } : m
                    )
                )
                await new Promise((r) => setTimeout(r, 2))
            }

            // Commit final state
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
                              thinkingStages,
                              reasoningSteps: thinkingStages.map((s) => s.text),
                              suggestions: [
                                  'Deconstruct primary premises',
                                  'Formulate counter-argument',
                                  'Synthesize dialectical resolution',
                              ],
                          }
                        : m
                )
            )
        } catch (error) {
            console.warn('[Ask AI] error:', error)
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === aiMsgId
                        ? { ...m, text: 'The philosopher network is unreachable right now. Please try again.', isStreaming: false }
                        : m
                )
            )
        } finally {
            setIsGenerating(false)
        }
    }

    return {
        messages,
        isGenerating,
        prompt,
        setPrompt,
        sendPrompt,
        clearMessages,
        executeOSAction,
        textareaRef,
        chatEndRef,
        abortControllerRef,
    }
}
