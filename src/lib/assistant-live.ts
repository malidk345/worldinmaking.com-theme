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
    readWatchMeta,
    notebooksDigestKey,
    tickLocalAssistantNotice,
} from './assistant-notices'
import { readPersonalAssistantId, type PersonalAssistantId } from './personal-assistant'
import { assistantMaxUnread } from './assistant-cadence'
import { applyAssistantAction, parseAssistantAction } from './assistant-actions'
import { collectUserWorld, worldAsWorkspace, worldDigest } from './assistant-world'
import {
    answersDigest,
    factsDigest,
    lastAnswersLookLikeDodges,
    recordAssistantAnswer,
    rememberAssistantFact,
} from './assistant-memory'
import { compactNoticeText } from './assistant-library'

async function streamText(
    prompt: string,
    philosopherId: string,
    notebookContext: string,
    signal: AbortSignal
): Promise<string> {
    const world = collectUserWorld()
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
            workspace: worldAsWorkspace(world),
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

function extrasBlock(): string {
    const world = worldDigest()
    const answers = answersDigest()
    const facts = factsDigest()
    const dodge = lastAnswersLookLikeDodges() ? 'Their last replies were short. Stay with the page, do not scold.' : ''
    return [world, `Previous answers:\n${answers}`, facts ? `Things you already know:\n${facts}` : '', dodge]
        .filter(Boolean)
        .join('\n\n')
}

export async function requestAssistantLiveNotice(
    kind: 'nag' | 'answer',
    answer?: { title: string; body?: string; text: string; philosopherId: PersonalAssistantId; noticeId?: string }
): Promise<boolean> {
    const philosopherId = (kind === 'answer' ? answer?.philosopherId : readPersonalAssistantId()) || null
    if (!philosopherId) return false
    if (kind === 'nag' && unreadAssistantCount() >= assistantMaxUnread()) return false
    const notebooks = collectUserNotebooks()
    if (kind === 'nag') {
        if (!notebooks.length) return false
        const digest = notebooksDigestKey(notebooks)
        const meta = readWatchMeta()
        if (digest === meta.lastDigest) return false
        if (meta.lastLocalAt && Date.now() - meta.lastLocalAt < 45 * 60_000) {
            writeWatchMeta({ lastDigest: digest })
            return false
        }
    }
    const extras = extrasBlock()
    const prompt =
        kind === 'answer' && answer
            ? liveAnswerPrompt({ philosopherId, title: answer.title, body: answer.body }, answer.text, extras)
            : liveNagPrompt(notebooks, extras)
    const abort = new AbortController()
    const timer = window.setTimeout(() => abort.abort(), 45_000)
    try {
        const raw = await streamText(prompt, philosopherId, notebookDigest(notebooks), abort.signal)
        const parsed = parseAssistantJson(raw)
        if (!parsed?.title) {
            if (kind === 'nag') return Boolean(tickLocalAssistantNotice())
            return false
        }
        const source = kind === 'answer' ? 'answer' : 'nag'
        const action = parseAssistantAction(parsed.action)
        const actionLabel = action ? applyAssistantAction(action, source) : null
        const created = pushAssistantNotice(
            buildNotice({
                philosopherId,
                kind: parsed.kind || (kind === 'answer' ? 'note' : 'reading'),
                title: parsed.title,
                body: compactNoticeText([parsed.body, actionLabel].filter(Boolean).join('\n\n')),
                notebookId: notebooks[0]?.id,
                actionLabel: actionLabel || undefined,
            }),
            { force: kind === 'answer' }
        )
        if (!created) {
            if (kind === 'nag') return Boolean(tickLocalAssistantNotice())
            return false
        }
        if (kind === 'nag') writeWatchMeta({ lastLiveAt: Date.now(), lastLocalAt: Date.now(), lastDigest: notebooksDigestKey(notebooks) })
        return true
    } catch {
        if (kind === 'nag') return Boolean(tickLocalAssistantNotice())
        return false
    } finally {
        window.clearTimeout(timer)
    }
}

export async function answerAssistantNotice(args: {
    philosopherId: PersonalAssistantId
    noticeId?: string
    title: string
    body?: string
    text: string
}): Promise<boolean> {
    recordAssistantAnswer({
        noticeId: args.noticeId || '',
        title: args.title,
        text: args.text,
        philosopherId: args.philosopherId,
    })
    rememberAssistantFact(`On "${args.title}" they said: ${args.text.slice(0, 160)}`)
    const ok = await requestAssistantLiveNotice('answer', {
        philosopherId: args.philosopherId,
        title: args.title,
        body: args.body,
        text: args.text,
        noticeId: args.noticeId,
    })
    if (ok) return true
    pushAssistantNotice(
        buildNotice({
            philosopherId: args.philosopherId,
            kind: 'note',
            title: 'Noted — here is where I would keep reading.',
            body: compactNoticeText(
                `You wrote: “${args.text.slice(0, 220)}”. I will stay with that rather than start a new interrogation.`
            ),
        }),
        { force: true }
    )
    return true
}
