import { chatAuthHeadersFresh } from './chat-remote'
import { parseAiSseEvent } from './ai/contracts'
import {
    collectUserNotebooks,
    liveNagPrompt,
    liveAnswerPrompt,
    notebookDigest,
    parseAssistantJson,
    pushAssistantNotice,
    buildNotice,
    unreadAssistantCount,
    writeWatchMeta,
    MAX_UNREAD,
} from './assistant-notices'
import { readPersonalAssistantId, type PersonalAssistantId } from './personal-assistant'

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
            ? liveAnswerPrompt({ philosopherId, title: answer.title, body: answer.body }, answer.text)
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

export async function answerAssistantNotice(args: {
    philosopherId: PersonalAssistantId
    title: string
    body?: string
    text: string
}): Promise<boolean> {
    const ok = await requestAssistantLiveNotice('answer', {
        philosopherId: args.philosopherId,
        title: args.title,
        body: args.body,
        text: args.text,
    })
    if (ok) return true
    pushAssistantNotice(
        buildNotice({
            philosopherId: args.philosopherId,
            kind: 'counsel',
            title: 'Noted. That does not close the question.',
            body: args.text.slice(0, 220),
        }),
        { force: true }
    )
    return true
}
