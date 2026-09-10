import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import SEO from 'components/seo'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { AppIcon } from 'components/OSIcons/AppIcon'
import { PHILOSOPHER_BOTS } from 'lib/persona-engine'
import { philosopherPixelAvatar } from 'lib/philosopher-pixels'
import { useOptionalWindow } from 'context/Window'
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
    extractAssistantNoticeId,
    getAssistantNotice,
    readAssistantNotices,
    seedAssistantNotices,
    type AssistantNotice,
    type AssistantNoticeKind,
} from 'lib/assistant-notices'
import { answerAssistantNotice } from 'lib/assistant-live'
import { AssistantReply } from './Reply'
import {
    ASSISTANT_CADENCE_EVENT,
    cadenceIntervals,
    muteAssistantTopic,
    readAssistantCadence,
    silenceAssistantFor,
    writeAssistantCadence,
    type CadenceMode,
} from 'lib/assistant-cadence'

dayjs.extend(relativeTime)

type MailFolder = 'all' | 'unread' | AssistantNoticeKind

function CadenceBar() {
    const [mode, setMode] = useState<CadenceMode>(() => readAssistantCadence().mode)
    const [quiet, setQuiet] = useState(() => readAssistantCadence().silencedUntil > Date.now())

    useEffect(() => {
        const refresh = () => {
            const next = readAssistantCadence()
            setMode(next.mode)
            setQuiet(next.silencedUntil > Date.now())
        }
        window.addEventListener(ASSISTANT_CADENCE_EVENT, refresh)
        return () => window.removeEventListener(ASSISTANT_CADENCE_EVENT, refresh)
    }, [])

    const set = (next: CadenceMode) => {
        writeAssistantCadence({ mode: next })
        setMode(next)
    }

    return (
        <div className="flex flex-col gap-1">
            {(['rare', 'normal', 'nag'] as CadenceMode[]).map((item) => (
                <OSButton
                    key={item}
                    size="sm"
                    width="full"
                    align="left"
                    hover="background"
                    active={mode === item}
                    onClick={() => set(item)}
                >
                    {item === 'rare' ? 'Rare' : item === 'nag' ? 'Nag' : 'Normal'}
                </OSButton>
            ))}
            <OSButton
                size="sm"
                width="full"
                align="left"
                hover="background"
                onClick={() => {
                    if (quiet) {
                        writeAssistantCadence({ silencedUntil: 0 })
                        setQuiet(false)
                    } else {
                        silenceAssistantFor(60 * 60 * 1000)
                        setQuiet(true)
                    }
                }}
            >
                {quiet ? 'Resume' : 'Quiet 1h'}
            </OSButton>
            <p className="m-0 px-2 text-xs text-muted">{cadenceIntervals(mode).maxUnread} unread max</p>
        </div>
    )
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
            className={`text-left rounded-lg border p-3 transition-colors hover:bg-accent ${
                selected ? 'border-primary bg-accent' : 'border-primary bg-primary'
            }`}
        >
            <div className="flex items-center gap-3">
                <span className="size-12 shrink-0 rounded-md border border-primary bg-accent overflow-hidden flex items-center justify-center">
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
                    <div className="p-2.5 rounded-lg bg-accent border border-primary shrink-0">
                        <AppIcon name="assistant" className="size-8" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary m-0">
                            Choose your assistant
                        </h1>
                        <p className="text-sm text-secondary mt-1 mb-0">
                            A resident philosopher takes the desk. Mail arrives in this window and in Notifications.
                            Click a letter to read it and reply.
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

function MailRow({
    notice,
    active,
    onOpen,
}: {
    notice: AssistantNotice
    active: boolean
    onOpen: () => void
}) {
    return (
        <OSButton
            align="left"
            width="full"
            hover="background"
            size="md"
            className={`flex-wrap @3xl:flex-nowrap !gap-0 @3xl:!gap-1 !items-start min-w-0 ${
                active ? 'font-bold bg-accent' : notice.unread ? 'font-semibold' : 'font-medium'
            }`}
            onClick={onOpen}
        >
            <div className="order-1 @3xl:order-none @3xl:w-40 @3xl:block @3xl:basis-auto basis-[70%] truncate">
                {notice.excerpt || 'Assistant'}
                {notice.unread ? <span className="ml-1 inline-block size-1.5 rounded-full bg-red align-middle" /> : null}
            </div>
            <div
                className={`order-3 @3xl:order-none flex-[1_0_100%] @3xl:flex-1 min-w-0 break-words ${
                    active ? 'font-medium @3xl:font-bold' : 'font-medium'
                }`}
            >
                {notice.title}
            </div>
            <div className="hidden @3xl:block w-20 text-center shrink-0 text-muted">{notice.count}</div>
            <div className="order-2 min-w-0 truncate text-right @3xl:text-left @3xl:basis-auto @3xl:w-32 @4xl:w-44 font-normal basis-[30%]">
                {dayjs(notice.date).fromNow()}
            </div>
        </OSButton>
    )
}

function LetterPane({
    notice,
    philosopherId,
    onClose,
    onDone,
}: {
    notice: AssistantNotice
    philosopherId: PersonalAssistantId
    onClose: () => void
    onDone: () => void
}) {
    const bot = PHILOSOPHER_BOTS.find((item) => item.id === philosopherId)
    const portrait = philosopherPixelAvatar(philosopherId)
    const [answering, setAnswering] = useState(false)
    const notebooks = useMemo(() => collectUserNotebooks(), [])
    const notebook = notebooks.find((nb) => nb.id === notice.notebookId)

    const submit = async (text: string) => {
        setAnswering(true)
        try {
            await answerAssistantNotice({
                philosopherId,
                noticeId: notice.id,
                title: notice.title,
                body: notice.body,
                text,
            })
            dismissAssistantNotice(notice.id)
            onDone()
        } finally {
            setAnswering(false)
        }
    }

    return (
        <div className="h-full min-h-0 flex flex-col bg-primary">
            <div className="flex items-start gap-3 px-3 py-2 border-b border-primary bg-accent shrink-0">
                <OSButton size="sm" hover="background" onClick={onClose}>
                    Close
                </OSButton>
                <div className="min-w-0 flex-1">
                    <p className="m-0 text-xs text-muted">From</p>
                    <p className="m-0 text-sm font-semibold truncate">{bot?.displayName || notice.excerpt}</p>
                    <h2 className="text-base font-semibold m-0 mt-1 leading-snug">{notice.title}</h2>
                    <p className="m-0 mt-1 text-xs text-muted">
                        {notice.count} · {dayjs(notice.date).fromNow()} · {dayjs(notice.date).format('MMM D, h:mm A')}
                    </p>
                </div>
                <span className="size-10 shrink-0 rounded-md border border-primary bg-primary overflow-hidden flex items-center justify-center">
                    {portrait ? (
                        <img src={portrait} alt="" width={40} height={40} className="size-10 object-contain" />
                    ) : null}
                </span>
            </div>
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 max-w-2xl">
                    <p className="m-0 text-sm text-primary leading-relaxed whitespace-pre-wrap">
                        {notice.body || notice.title}
                    </p>
                    {notebook ? (
                        <p className="text-xs text-muted mt-4 mb-0 border-t border-primary pt-3">
                            Re: notebook “{notebook.title}”
                        </p>
                    ) : null}
                    {notice.actionLabel ? (
                        <p className="text-xs text-secondary mt-2 mb-0">{notice.actionLabel}</p>
                    ) : null}
                </div>
            </ScrollArea>
            <div className="border-t border-primary p-3 bg-primary shrink-0">
                <p className="m-0 mb-2 text-xs text-muted">Reply to {bot?.name || 'your assistant'}</p>
                <AssistantReply
                    answering={answering}
                    submitLabel="Send"
                    placeholder="Write a reply. They will read it and write back."
                    onAnswer={(text) => void submit(text)}
                    onDismiss={() => {
                        dismissAssistantNotice(notice.id)
                        onDone()
                    }}
                    extra={
                        <OSButton
                            size="sm"
                            hover="background"
                            onClick={() => {
                                muteAssistantTopic(notice.title)
                                dismissAssistantNotice(notice.id)
                                onDone()
                            }}
                        >
                            Drop this
                        </OSButton>
                    }
                />
            </div>
        </div>
    )
}

function MailDesk({
    philosopherId,
    onChange,
    initialNoticeId,
}: {
    philosopherId: PersonalAssistantId
    onChange: () => void
    initialNoticeId?: string | null
}) {
    const bot = PHILOSOPHER_BOTS.find((item) => item.id === philosopherId)
    const portrait = philosopherPixelAvatar(philosopherId)
    const [notices, setNotices] = useState<AssistantNotice[]>(() => readAssistantNotices())
    const [openId, setOpenId] = useState<string | null>(initialNoticeId || null)
    const [folder, setFolder] = useState<MailFolder>('all')

    useEffect(() => {
        const refresh = () => setNotices(readAssistantNotices())
        refresh()
        window.addEventListener(ASSISTANT_NOTICES_EVENT, refresh)
        return () => window.removeEventListener(ASSISTANT_NOTICES_EVENT, refresh)
    }, [philosopherId])

    useEffect(() => {
        if (initialNoticeId) setOpenId(initialNoticeId)
    }, [initialNoticeId])

    const mine = notices.filter((n) => n.philosopherId === philosopherId)
    const unread = mine.filter((n) => n.unread)
    const filtered = mine.filter((n) => {
        if (folder === 'all') return true
        if (folder === 'unread') return n.unread
        return n.kind === folder
    })
    const openNotice = openId ? mine.find((n) => n.id === openId) || getAssistantNotice(openId) : null

    const folders: Array<{ id: MailFolder; label: string; count: number }> = [
        { id: 'all', label: 'Inbox', count: mine.length },
        { id: 'unread', label: 'Unread', count: unread.length },
        { id: 'nag', label: 'Nags', count: mine.filter((n) => n.kind === 'nag').length },
        { id: 'question', label: 'Questions', count: mine.filter((n) => n.kind === 'question').length },
        { id: 'counsel', label: 'Counsel', count: mine.filter((n) => n.kind === 'counsel').length },
        { id: 'reading', label: 'Reading', count: mine.filter((n) => n.kind === 'reading').length },
    ]

    const closeLetter = () => setOpenId(null)

    return (
        <div className="@container h-full min-h-0 flex flex-col bg-primary text-primary">
            <div data-scheme="secondary" className="flex @2xl:flex-row flex-col flex-1 min-h-0 overflow-hidden">
                <aside
                    data-scheme="secondary"
                    className="w-full @2xl:w-56 bg-primary flex-shrink-0 @2xl:border-r border-primary @2xl:h-full @2xl:min-h-0 border-b @2xl:border-b-0"
                >
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-primary">
                        <span className="size-8 shrink-0 rounded-md border border-primary bg-accent overflow-hidden flex items-center justify-center">
                            {portrait ? (
                                <img src={portrait} alt="" width={32} height={32} className="size-8 object-contain" />
                            ) : null}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="m-0 text-sm font-semibold truncate">{bot?.displayName || 'Assistant'}</p>
                            <p className="m-0 text-xs text-muted truncate">Mail</p>
                        </div>
                        <OSButton size="sm" hover="background" onClick={onChange}>
                            Change
                        </OSButton>
                    </div>
                    <ScrollArea className="hidden @2xl:block flex-1 min-h-0 p-2">
                        <div className="flex flex-col gap-px mb-3">
                            {folders.map((item) => (
                                <OSButton
                                    key={item.id}
                                    align="left"
                                    width="full"
                                    hover="background"
                                    size="sm"
                                    className={folder === item.id ? 'font-semibold bg-accent' : ''}
                                    onClick={() => setFolder(item.id)}
                                >
                                    <span className="flex-1 text-left">{item.label}</span>
                                    <span className="text-muted">{item.count || ''}</span>
                                </OSButton>
                            ))}
                        </div>
                        <p className="m-0 mb-1 px-2 text-xs text-muted uppercase tracking-wide">Cadence</p>
                        <CadenceBar />
                    </ScrollArea>
                    <div className="@2xl:hidden p-2 flex gap-1 overflow-x-auto">
                        {folders.map((item) => (
                            <OSButton
                                key={item.id}
                                size="sm"
                                hover="background"
                                active={folder === item.id}
                                onClick={() => setFolder(item.id)}
                            >
                                {item.label}
                                {item.count ? ` ${item.count}` : ''}
                            </OSButton>
                        ))}
                    </div>
                </aside>

                <main
                    data-scheme="primary"
                    className="flex-1 min-h-0 bg-primary overflow-hidden flex @2xl:flex-row flex-col"
                >
                    <div className={`@container flex-1 min-h-0 min-w-0 text-sm overflow-hidden ${openNotice ? '@2xl:block hidden' : ''}`}>
                        <ScrollArea className="h-full">
                            <div className="flex items-center gap-2 pl-2.5 pr-4 py-2 border-b border-primary font-medium bg-accent text-sm sticky top-0 text-primary z-10 min-w-0">
                                <div className="hidden @3xl:block w-40 shrink-0">From</div>
                                <div className="flex-1 min-w-0 truncate">
                                    <span className="@3xl:hidden">From / Subject</span>
                                    <span className="hidden @3xl:block">Subject</span>
                                </div>
                                <div className="hidden @3xl:block w-20 text-center shrink-0">Kind</div>
                                <div className="hidden @xl:block min-w-0 w-32 @4xl:w-44 truncate">Received</div>
                            </div>
                            <div className="px-1 py-1 space-y-px">
                                {filtered.map((notice) => (
                                    <MailRow
                                        key={notice.id}
                                        notice={notice}
                                        active={openId === notice.id}
                                        onOpen={() => setOpenId(notice.id)}
                                    />
                                ))}
                                {filtered.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-primary">
                                        <div className="text-lg mb-2 font-semibold">No mail here</div>
                                        <div className="text-secondary text-sm">
                                            {bot?.name || 'Your assistant'} is reading. Letters will land here and in
                                            Notifications.
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </ScrollArea>
                    </div>

                    {openNotice ? (
                        <div className="relative min-h-0 min-w-0 flex-1 @2xl:flex-[1.15] flex flex-col overflow-hidden bg-primary @2xl:border-l border-t @2xl:border-t-0 border-primary">
                            <LetterPane
                                notice={openNotice}
                                philosopherId={philosopherId}
                                onClose={closeLetter}
                                onDone={() => {
                                    setOpenId(null)
                                    setNotices(readAssistantNotices())
                                }}
                            />
                        </div>
                    ) : null}
                </main>
            </div>
        </div>
    )
}

export function AssistantWindow() {
    const win = useOptionalWindow()
    const pathNoticeId = extractAssistantNoticeId(win?.appWindow?.path)
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
                description="Mail from a resident philosopher. Read the letter, write back."
            />
            {!ready ? <div className="flex-1" /> : null}
            {ready && (picking || !assistantId) ? (
                <PickerScreen currentId={assistantId} onChoose={choose} />
            ) : null}
            {ready && assistantId && !picking ? (
                <MailDesk
                    philosopherId={assistantId}
                    onChange={() => setPicking(true)}
                    initialNoticeId={pathNoticeId}
                />
            ) : null}
        </div>
    )
}

export default AssistantWindow
