import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
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
import {
    ASSISTANT_NOTICES_EVENT,
    collectUserNotebooks,
    dismissAssistantNotice,
    pushAssistantNotice,
    buildNotice,
    readAssistantNotices,
    seedAssistantNotices,
    type AssistantNotice,
} from 'lib/assistant-notices'
import { requestAssistantLiveNotice } from './Watch'

dayjs.extend(relativeTime)

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
                            A resident philosopher takes the desk. They read your notebooks, counsel you, ask questions,
                            and drop notices in the notification panel until you answer.
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

function NoticeRow({
    notice,
    open,
    onOpen,
    onDismiss,
    onAnswer,
    answering,
}: {
    notice: AssistantNotice
    open: boolean
    onOpen: () => void
    onDismiss: () => void
    onAnswer: (text: string) => void
    answering: boolean
}) {
    const [draft, setDraft] = useState('')

    return (
        <li>
            <button
                type="button"
                onClick={onOpen}
                className="w-full text-left p-2 hover:bg-accent rounded active:scale-[0.98]"
            >
                {notice.excerpt ? <div className="text-xs line-clamp-1 text-muted">{notice.excerpt}</div> : null}
                <div className="text-sm line-clamp-1 font-semibold">{notice.title}</div>
                <div className="flex-shrink-0 text-sm font-normal text-right flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                        <p className="m-0 text-sm font-bold text-red">+{notice.count}</p>
                        <div className="text-primary dark:text-primary-dark font-medium opacity-60 line-clamp-2">
                            {dayjs(notice.date).fromNow()}
                        </div>
                    </div>
                </div>
            </button>
            {open ? (
                <div className="px-2 pb-3 space-y-2">
                    {notice.body ? <p className="m-0 text-sm text-secondary">{notice.body}</p> : null}
                    <textarea
                        data-writing-surface
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={2}
                        placeholder="Answer this. They will not let it drop."
                        className="w-full resize-none rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-input"
                    />
                    <div className="flex items-center gap-2">
                        <OSButton
                            size="sm"
                            variant="primary"
                            disabled={answering || !draft.trim()}
                            onClick={() => {
                                const text = draft.trim()
                                if (!text) return
                                onAnswer(text)
                                setDraft('')
                            }}
                        >
                            {answering ? '…' : 'Answer'}
                        </OSButton>
                        <OSButton size="sm" hover="background" onClick={onDismiss}>
                            Dismiss
                        </OSButton>
                    </div>
                </div>
            ) : null}
        </li>
    )
}

function BriefingScreen({
    philosopherId,
    onChange,
}: {
    philosopherId: PersonalAssistantId
    onChange: () => void
}) {
    const bot = PHILOSOPHER_BOTS.find((item) => item.id === philosopherId)
    const portrait = philosopherPixelAvatar(philosopherId)
    const [notices, setNotices] = useState<AssistantNotice[]>(() => readAssistantNotices())
    const [openId, setOpenId] = useState<string | null>(null)
    const [answering, setAnswering] = useState(false)
    const notebooks = useMemo(() => collectUserNotebooks(), [notices.length])

    useEffect(() => {
        const refresh = () => setNotices(readAssistantNotices())
        refresh()
        window.addEventListener(ASSISTANT_NOTICES_EVENT, refresh)
        return () => window.removeEventListener(ASSISTANT_NOTICES_EVENT, refresh)
    }, [philosopherId])

    const mine = notices.filter((n) => n.philosopherId === philosopherId)
    const watching = notebooks.length

    const answer = async (notice: AssistantNotice, text: string) => {
        setAnswering(true)
        dismissAssistantNotice(notice.id)
        try {
            const ok = await requestAssistantLiveNotice('answer', {
                title: notice.title,
                body: notice.body,
                text,
                philosopherId,
            })
            if (!ok) {
                pushAssistantNotice(
                    buildNotice({
                        philosopherId,
                        kind: 'counsel',
                        title: 'Noted. That does not close the question.',
                        body: text.slice(0, 220),
                    }),
                    { force: true }
                )
            }
        } finally {
            setAnswering(false)
            setNotices(readAssistantNotices())
        }
    }

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
                    <p className="m-0 text-xs text-muted truncate">
                        {watching
                            ? `Reading ${watching} notebook${watching === 1 ? '' : 's'} · nags land in Notifications`
                            : 'No notebooks yet · they will keep asking why'}
                    </p>
                </div>
                <OSButton size="sm" hover="background" onClick={onChange}>
                    Change
                </OSButton>
            </div>

            <div className="flex-1 min-h-0">
                <ScrollArea className="p-2 h-full">
                    {mine.length > 0 ? (
                        <ul className="list-none m-0 p-0 space-y-1 max-w-xl mx-auto">
                            {mine.map((notice) => (
                                <NoticeRow
                                    key={notice.id}
                                    notice={notice}
                                    open={openId === notice.id}
                                    answering={answering}
                                    onOpen={() => setOpenId((id) => (id === notice.id ? null : notice.id))}
                                    onDismiss={() => {
                                        dismissAssistantNotice(notice.id)
                                        setNotices(readAssistantNotices())
                                        if (openId === notice.id) setOpenId(null)
                                    }}
                                    onAnswer={(text) => void answer(notice, text)}
                                />
                            ))}
                        </ul>
                    ) : (
                        <h5 className="m-0 px-2">
                            {bot?.name || 'Your assistant'} is reading. Notices will land here and in the notification
                            panel.
                        </h5>
                    )}
                </ScrollArea>
            </div>
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
        seedAssistantNotices(id)
        setAssistantId(id)
        setPicking(false)
    }

    return (
        <div data-scheme="primary" className="@container bg-primary text-primary h-full flex flex-col min-h-0 font-sans">
            <SEO
                title="Assistant"
                description="A resident philosopher reads your notebooks, counsels you, and nags you from the notification panel."
            />
            {!ready ? <div className="flex-1" /> : null}
            {ready && (picking || !assistantId) ? (
                <PickerScreen currentId={assistantId} onChoose={choose} />
            ) : null}
            {ready && assistantId && !picking ? (
                <BriefingScreen philosopherId={assistantId} onChange={() => setPicking(true)} />
            ) : null}
        </div>
    )
}

export default AssistantWindow
