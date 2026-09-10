import { useEffect, useRef } from 'react'
import { chatAuthHeadersFresh } from 'lib/chat-remote'
import { parseAiSseEvent } from 'lib/ai/contracts'
import {
    collectUserNotebooks,
    liveNagPrompt,
    liveAnswerPrompt,
    notebookDigest,
    parseAssistantJson,
    pushAssistantNotice,
    buildNotice,
    seedAssistantNotices,
    tickLocalAssistantNotice,
    tickNotebookReadingNotice,
    unreadAssistantCount,
    writeWatchMeta,
    readWatchMeta,
    MAX_UNREAD,
} from 'lib/assistant-notices'
import { PERSONAL_ASSISTANT_EVENT, readPersonalAssistantId, type PersonalAssistantId } from 'lib/personal-assistant'

const NOTEBOOKS_CHANGED = 'wimNotebooksChanged'
const NOTEBOOKS_HYDRATED = 'wimNotebooksHydrated'
const LOCAL_EVERY_MS = 90_000
const LIVE_EVERY_MS = 5 * 60_000
const FIRST_LIVE_MS = 8_000
const NOTEBOOK_DEBOUNCE_MS = 22_000

async function streamText(
    prompt: string,
    philosopherId: string,
    notebookContext: string,
    signal: AbortSignal
): Promise<string> {
    const notebooks = collectUserNotebooks().slice(0, 8).map((nb) => ({
        id: nb.id,
        title: nb.title,
        content: nb.content.slice(0, 4000),
    }))
    const headers = await chatAuthHeadersFresh(true)
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({
            prompt,
            modelId: philosopherId,
            conversationId: `assistant-watch-${philosopherId}`,
            notebookContext,
            notebookBound: true,
            host: { path: '/assistant', notebooks },
        }),
    })
    if (!res.ok || !res.body) return ''
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split('\n\n')
        buffer = frames.pop() || ''
        for (const frame of frames) {
            const event = parseAiSseEvent(frame)
            if (!event) continue
            if (event.type === 'token' && event.text) fullText += event.text
            else if (event.type === 'done' && event.fullText) fullText = event.fullText
            else if (event.type === 'error') return fullText.trim()
        }
    }
    return fullText.trim()
}

export async function requestAssistantLiveNotice(
    kind: 'nag' | 'answer',
    answer?: { title: string; body?: string; text: string; philosopherId: PersonalAssistantId }
): Promise<boolean> {
    const philosopherId = (kind === 'answer' ? answer?.philosopherId : readPersonalAssistantId()) || null
    if (!philosopherId) return false
    if (kind === 'nag' && unreadAssistantCount() >= MAX_UNREAD) return false
    const notebooks = collectUserNotebooks()
    const prompt =
        kind === 'answer' && answer
            ? liveAnswerPrompt(
                  { philosopherId, title: answer.title, body: answer.body },
                  answer.text
              )
            : liveNagPrompt(notebooks)
    const abort = new AbortController()
    const timer = window.setTimeout(() => abort.abort(), 45_000)
    try {
        const raw = await streamText(prompt, philosopherId, notebookDigest(notebooks), abort.signal)
        const parsed = parseAssistantJson(raw)
        if (!parsed?.title) return false
        const created = pushAssistantNotice(
            buildNotice({
                philosopherId,
                kind: parsed.kind || (kind === 'answer' ? 'counsel' : 'nag'),
                title: parsed.title,
                body: parsed.body,
                notebookId: notebooks[0]?.id,
            }),
            { force: kind === 'answer' }
        )
        if (!created) return false
        if (kind === 'nag') writeWatchMeta({ lastLiveAt: Date.now() })
        return true
    } catch {
        return false
    } finally {
        window.clearTimeout(timer)
    }
}

export default function AssistantWatch() {
    const liveLock = useRef(false)
    const notebookTimer = useRef<number | null>(null)

    useEffect(() => {
        const seed = () => {
            const id = readPersonalAssistantId()
            if (id) seedAssistantNotices(id)
        }
        seed()
        window.addEventListener(PERSONAL_ASSISTANT_EVENT, seed)
        return () => window.removeEventListener(PERSONAL_ASSISTANT_EVENT, seed)
    }, [])

    useEffect(() => {
        const localTick = () => {
            if (document.visibilityState === 'hidden') return
            if (!readPersonalAssistantId()) return
            const meta = readWatchMeta()
            if (Date.now() - meta.lastLocalAt < LOCAL_EVERY_MS - 5_000) return
            tickLocalAssistantNotice()
        }
        const id = window.setInterval(localTick, LOCAL_EVERY_MS)
        const onFocus = () => localTick()
        window.addEventListener('focus', onFocus)
        return () => {
            window.clearInterval(id)
            window.removeEventListener('focus', onFocus)
        }
    }, [])

    useEffect(() => {
        const runLive = async () => {
            if (liveLock.current) return
            if (document.visibilityState === 'hidden') return
            const id = readPersonalAssistantId()
            if (!id) return
            const meta = readWatchMeta()
            if (Date.now() - meta.lastLiveAt < LIVE_EVERY_MS - 5_000) return
            liveLock.current = true
            try {
                await requestAssistantLiveNotice('nag')
            } finally {
                liveLock.current = false
            }
        }
        const start = window.setTimeout(() => {
            void runLive()
        }, FIRST_LIVE_MS)
        const id = window.setInterval(() => {
            void runLive()
        }, LIVE_EVERY_MS)
        return () => {
            window.clearTimeout(start)
            window.clearInterval(id)
        }
    }, [])

    useEffect(() => {
        const onNotebooks = () => {
            if (!readPersonalAssistantId()) return
            if (notebookTimer.current) window.clearTimeout(notebookTimer.current)
            notebookTimer.current = window.setTimeout(() => {
                tickNotebookReadingNotice()
            }, NOTEBOOK_DEBOUNCE_MS)
        }
        window.addEventListener(NOTEBOOKS_CHANGED, onNotebooks)
        window.addEventListener(NOTEBOOKS_HYDRATED, onNotebooks)
        return () => {
            window.removeEventListener(NOTEBOOKS_CHANGED, onNotebooks)
            window.removeEventListener(NOTEBOOKS_HYDRATED, onNotebooks)
            if (notebookTimer.current) window.clearTimeout(notebookTimer.current)
        }
    }, [])

    return null
}
