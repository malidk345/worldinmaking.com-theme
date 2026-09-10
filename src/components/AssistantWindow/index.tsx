import React, { useCallback, useEffect, useRef, useState } from 'react'
import SEO from 'components/seo'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { AppIcon } from 'components/OSIcons/AppIcon'
import { PHILOSOPHER_BOTS } from 'lib/persona-engine'
import { philosopherPixelAvatar } from 'lib/philosopher-pixels'
import {
    PERSONAL_ASSISTANT_EVENT,
    readPersonalAssistantId,
    writePersonalAssistantId,
    type PersonalAssistantId,
} from 'lib/personal-assistant'
import { chatAuthHeadersFresh } from 'lib/chat-remote'
import { parseAiSseEvent } from 'lib/ai/contracts'
import { getActiveOwnerKey, DEVICE_CHAT_OWNER_KEY, namespacedStorageKey } from 'lib/wim-identity'

type ChatRole = 'user' | 'assistant'
type ChatTurn = { id: string; role: ChatRole; text: string }

const CHAT_STORAGE_BASE = 'wim_assistant_chats_v1'

function chatStorageKey(philosopherId: PersonalAssistantId): string {
    return namespacedStorageKey(`${CHAT_STORAGE_BASE}:${philosopherId}`, getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY))
}

function readChats(philosopherId: PersonalAssistantId): ChatTurn[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(chatStorageKey(philosopherId))
        const parsed = raw ? JSON.parse(raw) : []
        if (!Array.isArray(parsed)) return []
        return parsed.filter(
            (item): item is ChatTurn =>
                item &&
                typeof item.id === 'string' &&
                (item.role === 'user' || item.role === 'assistant') &&
                typeof item.text === 'string'
        )
    } catch {
        return []
    }
}

function writeChats(philosopherId: PersonalAssistantId, turns: ChatTurn[]): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(chatStorageKey(philosopherId), JSON.stringify(turns.slice(-80)))
    } catch {
        /* quota */
    }
}

function newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function streamAssistantReply(args: {
    philosopherId: PersonalAssistantId
    prompt: string
    history: ChatTurn[]
    signal: AbortSignal
    onToken: (text: string) => void
}): Promise<string> {
    const headers = await chatAuthHeadersFresh(true)
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        signal: args.signal,
        body: JSON.stringify({
            prompt: args.prompt,
            modelId: args.philosopherId,
            conversationId: `assistant-${args.philosopherId}`,
            messages: args.history.slice(-16).map((turn) => ({
                role: turn.role,
                content: turn.text.slice(0, 4000),
            })),
        }),
    })

    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const message =
            typeof (body as { error?: unknown }).error === 'string'
                ? (body as { error: string }).error
                : 'The assistant could not reply. Try again in a moment.'
        throw new Error(message)
    }

    if (!res.body) throw new Error('Empty reply from the assistant.')

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
            if (event.type === 'token' && event.text) {
                fullText += event.text
                args.onToken(fullText)
            } else if (event.type === 'done' && event.fullText) {
                fullText = event.fullText
                args.onToken(fullText)
            } else if (event.type === 'error') {
                throw new Error(event.message || 'The assistant could not reply.')
            }
        }
    }

    return fullText.trim()
}

function PhilosopherCard({
    id,
    name,
    displayName,
    shortStance,
    selected,
    onSelect,
}: {
    id: PersonalAssistantId
    name: string
    displayName: string
    shortStance: string
    selected: boolean
    onSelect: (id: PersonalAssistantId) => void
}) {
    const portrait = philosopherPixelAvatar(id)
    return (
        <button
            type="button"
            onClick={() => onSelect(id)}
            className={`text-left rounded-lg border p-3 transition-colors hover:bg-accent/30 ${
                selected ? 'border-primary bg-accent/40' : 'border-primary bg-primary'
            }`}
        >
            <div className="flex items-center gap-3">
                <span className="size-12 shrink-0 rounded-md border border-primary bg-accent/30 overflow-hidden flex items-center justify-center">
                    {portrait ? (
                        <img src={portrait} alt="" width={48} height={48} className="size-12 object-contain" />
                    ) : (
                        <span className="text-sm font-bold">{name.slice(0, 1)}</span>
                    )}
                </span>
                <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{displayName}</span>
                    <span className="block text-xs text-muted mt-0.5">{shortStance}</span>
                </span>
            </div>
        </button>
    )
}

function PickerScreen({
    currentId,
    onChoose,
}: {
    currentId: PersonalAssistantId | null
    onChoose: (id: PersonalAssistantId) => void
}) {
    return (
        <ScrollArea className="h-full w-full">
            <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
                <div className="flex items-start gap-4 pb-4 border-b border-primary">
                    <div className="p-2.5 rounded-lg bg-accent/40 border border-primary shrink-0">
                        <AppIcon name="assistant" className="size-8" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary m-0">
                            Choose your assistant
                        </h1>
                        <p className="text-sm text-secondary mt-1 mb-0">
                            One of the resident philosophers becomes your personal assistant. You can change this later.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 @sm:grid-cols-2 gap-2.5">
                    {PHILOSOPHER_BOTS.map((bot) => (
                        <PhilosopherCard
                            key={bot.id}
                            id={bot.id as PersonalAssistantId}
                            name={bot.name}
                            displayName={bot.displayName}
                            shortStance={bot.shortStance}
                            selected={currentId === bot.id}
                            onSelect={onChoose}
                        />
                    ))}
                </div>
            </div>
        </ScrollArea>
    )
}

function ChatScreen({
    philosopherId,
    onChange,
}: {
    philosopherId: PersonalAssistantId
    onChange: () => void
}) {
    const bot = PHILOSOPHER_BOTS.find((item) => item.id === philosopherId)
    const portrait = philosopherPixelAvatar(philosopherId)
    const [turns, setTurns] = useState<ChatTurn[]>(() => readChats(philosopherId))
    const [draft, setDraft] = useState('')
    const [streaming, setStreaming] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const abortRef = useRef<AbortController | null>(null)
    const endRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setTurns(readChats(philosopherId))
        setDraft('')
        setError(null)
    }, [philosopherId])

    useEffect(() => {
        writeChats(philosopherId, turns)
    }, [philosopherId, turns])

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'end' })
    }, [turns, streaming])

    useEffect(() => {
        return () => abortRef.current?.abort()
    }, [])

    const send = useCallback(async () => {
        const prompt = draft.trim()
        if (!prompt || streaming) return
        const userTurn: ChatTurn = { id: newId('user'), role: 'user', text: prompt }
        const history = [...turns, userTurn]
        setTurns(history)
        setDraft('')
        setError(null)
        setStreaming(true)

        const assistantId = newId('assistant')
        setTurns((prev) => [...prev, { id: assistantId, role: 'assistant', text: '' }])

        abortRef.current?.abort()
        const abort = new AbortController()
        abortRef.current = abort

        try {
            const fullText = await streamAssistantReply({
                philosopherId,
                prompt,
                history,
                signal: abort.signal,
                onToken: (text) => {
                    setTurns((prev) =>
                        prev.map((turn) => (turn.id === assistantId ? { ...turn, text } : turn))
                    )
                },
            })
            setTurns((prev) =>
                prev.map((turn) => (turn.id === assistantId ? { ...turn, text: fullText || turn.text } : turn))
            )
        } catch (err) {
            if ((err as { name?: string })?.name === 'AbortError') return
            const message = err instanceof Error ? err.message : 'The assistant could not reply.'
            setError(message)
            setTurns((prev) => prev.filter((turn) => turn.id !== assistantId || turn.text.trim()))
        } finally {
            setStreaming(false)
        }
    }, [draft, philosopherId, streaming, turns])

    return (
        <div className="h-full min-h-0 flex flex-col">
            <div className="flex items-center gap-3 px-3 py-2 border-b border-primary bg-primary shrink-0">
                <span className="size-9 shrink-0 rounded-md border border-primary bg-accent/30 overflow-hidden flex items-center justify-center">
                    {portrait ? (
                        <img src={portrait} alt="" width={36} height={36} className="size-9 object-contain" />
                    ) : null}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-semibold truncate">{bot?.displayName || 'Assistant'}</p>
                    <p className="m-0 text-xs text-muted truncate">{bot?.shortStance || 'Personal assistant'}</p>
                </div>
                <OSButton size="sm" hover="background" onClick={onChange}>
                    Change
                </OSButton>
            </div>

            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-3 max-w-2xl mx-auto">
                    {!turns.length ? (
                        <div className="text-center py-10">
                            <p className="m-0 text-sm text-secondary">
                                {bot?.displayName || 'Your assistant'} is ready. Write anything — this thread stays on
                                this device.
                            </p>
                        </div>
                    ) : null}
                    {turns.map((turn) => (
                        <div
                            key={turn.id}
                            className={`max-w-[92%] rounded-lg border border-primary px-3 py-2 text-sm whitespace-pre-wrap ${
                                turn.role === 'user' ? 'ml-auto bg-accent/40' : 'mr-auto bg-primary'
                            }`}
                        >
                            {turn.text || (streaming ? '…' : '')}
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>
            </ScrollArea>

            <form
                className="shrink-0 border-t border-primary p-3 bg-primary"
                onSubmit={(e) => {
                    e.preventDefault()
                    void send()
                }}
            >
                {error ? <p className="m-0 mb-2 text-xs text-red">{error}</p> : null}
                <div className="flex items-end gap-2">
                    <textarea
                        data-writing-surface
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                void send()
                            }
                        }}
                        rows={2}
                        placeholder={`Write to ${bot?.name || 'your assistant'}…`}
                        className="flex-1 min-w-0 resize-none rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-input"
                    />
                    <OSButton type="submit" size="md" variant="primary" disabled={streaming || !draft.trim()}>
                        {streaming ? '…' : 'Send'}
                    </OSButton>
                </div>
            </form>
        </div>
    )
}

export function AssistantWindow() {
    const [assistantId, setAssistantId] = useState<PersonalAssistantId | null>(null)
    const [picking, setPicking] = useState(false)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const apply = () => {
            const id = readPersonalAssistantId()
            setAssistantId(id)
            setPicking(!id)
            setReady(true)
        }
        apply()
        window.addEventListener(PERSONAL_ASSISTANT_EVENT, apply)
        return () => window.removeEventListener(PERSONAL_ASSISTANT_EVENT, apply)
    }, [])

    const choose = (id: PersonalAssistantId) => {
        writePersonalAssistantId(id)
        setAssistantId(id)
        setPicking(false)
    }

    return (
        <div data-scheme="primary" className="@container bg-primary text-primary h-full flex flex-col min-h-0 font-sans">
            <SEO
                title="Assistant"
                description="Choose a resident philosopher as your personal assistant on WorldInMaking."
            />
            {!ready ? <div className="flex-1" /> : null}
            {ready && (picking || !assistantId) ? (
                <PickerScreen currentId={assistantId} onChoose={choose} />
            ) : null}
            {ready && assistantId && !picking ? (
                <ChatScreen philosopherId={assistantId} onChange={() => setPicking(true)} />
            ) : null}
        </div>
    )
}

export default AssistantWindow
