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
import { useUser } from 'hooks/useUser'
import getAvatarURL from 'components/Squeak/util/getAvatar'
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
} from 'lib/assistant-notices'
import { answerAssistantNotice } from 'lib/assistant-live'
import { readAssistantAnswers } from 'lib/assistant-memory'
import { AssistantReply } from './Reply'
import {
    ASSISTANT_CADENCE_EVENT,
    muteAssistantTopic,
    readAssistantCadence,
    silenceAssistantFor,
    writeAssistantCadence,
    type CadenceMode,
} from 'lib/assistant-cadence'

dayjs.extend(relativeTime)

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

    return (
        <div className="flex items-center gap-1">
            {(['rare', 'normal', 'nag'] as CadenceMode[]).map((item) => (
                <OSButton
                    key={item}
                    size="xs"
                    hover="background"
                    active={mode === item}
                    onClick={() => {
                        writeAssistantCadence({ mode: item })
                        setMode(item)
                    }}
                >
                    {item === 'rare' ? 'Rare' : item === 'nag' ? 'Nag' : 'Normal'}
                </OSButton>
            ))}
            <OSButton
                size="xs"
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
                <span className="size-12 shrink-0 rounded-full border border-primary bg-accent overflow-hidden flex items-center justify-center">
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
                            They write you mail. Open a notice and reply in the thread, the same way the forum inbox
                            works.
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
    active,
    onOpen,
}: {
    notice: AssistantNotice
    active: boolean
    onOpen: () => void
}) {
    return (
        <li>
            <button
                type="button"
                onClick={onOpen}
                className={`w-full text-left p-2 hover:bg-accent rounded active:scale-[0.98] ${
                    active ? 'bg-accent' : ''
                }`}
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
        </li>
    )
}

function LetterThread({
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
    const { user } = useUser()
    const [answering, setAnswering] = useState(false)
    const [composing, setComposing] = useState(false)
    const notebooks = useMemo(() => collectUserNotebooks(), [])
    const notebook = notebooks.find((nb) => nb.id === notice.notebookId)
    const replies = readAssistantAnswers().filter((row) => row.noticeId === notice.id)
    const userName =
        [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(' ') || user?.username || 'You'
    const userAvatar = getAvatarURL(user?.profile)

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

    const openComposer = () => {
        setComposing(true)
        window.setTimeout(() => document.getElementById('assistant-reply-box')?.focus(), 0)
    }

    return (
        <div className="h-full min-h-0 flex flex-col bg-primary">
            <ScrollArea className="flex-1 min-h-0">
                <div className="text-primary min-w-0">
                    <div className="flex items-center gap-2 w-full min-w-0 flex-wrap pt-5 pl-5 pr-8">
                        <div className="flex items-center">
                            <div className="size-10 shrink-0 rounded-full mr-2.5 overflow-hidden bg-accent">
                                {portrait ? (
                                    <img src={portrait} alt="" width={40} height={40} className="size-10 object-contain" />
                                ) : null}
                            </div>
                            <strong>{bot?.displayName || notice.excerpt || 'Assistant'}</strong>
                        </div>
                        <span className="text-sm text-muted" suppressHydrationWarning>
                            {dayjs(notice.date).fromNow()}
                        </span>
                    </div>

                    <div className="pb-4 min-w-0 pl-5 pr-8">
                        <h3 className="text-base font-semibold !mt-2 !mb-0 pb-1 leading-5 break-words">
                            {notice.title}
                        </h3>
                        <div className="question-content text-primary">
                            <p className="mt-2 mb-0 whitespace-pre-wrap leading-7">{notice.body || notice.title}</p>
                        </div>
                        {notebook ? (
                            <p className="text-xs text-secondary pb-0 mb-0 mt-3">
                                Originally from notebook “{notebook.title}”
                            </p>
                        ) : null}
                    </div>

                    {replies.map((reply) => (
                        <div key={reply.id}>
                            <div className="flex items-center gap-2 w-full min-w-0 flex-wrap pt-4 pl-5 pr-8">
                                <div className="flex items-center">
                                    <div className="size-10 shrink-0 rounded-full mr-2.5 overflow-hidden bg-accent">
                                        {userAvatar ? (
                                            <img src={userAvatar} alt="" className="size-10 object-cover" />
                                        ) : (
                                            <span className="size-10 flex items-center justify-center text-sm font-semibold">
                                                {userName.slice(0, 1)}
                                            </span>
                                        )}
                                    </div>
                                    <strong>{userName}</strong>
                                </div>
                                <span className="text-sm text-muted" suppressHydrationWarning>
                                    {dayjs(reply.at).fromNow()}
                                </span>
                            </div>
                            <div className="pb-4 pl-5 pr-8">
                                <p className="mt-2 mb-0 whitespace-pre-wrap leading-7">{reply.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            {composing ? (
                <div data-scheme="primary" className="bg-primary border-t border-primary pt-3 px-4 pb-3">
                    <AssistantReply
                        answering={answering}
                        submitLabel="Reply"
                        placeholder="Reply…"
                        onAnswer={(text) => void submit(text)}
                    />
                </div>
            ) : null}
            <div className="bg-accent border-t border-primary px-4 py-2 flex gap-2 items-center shrink-0">
                <OSButton variant="secondary" size="xs" onClick={openComposer}>
                    Reply
                </OSButton>
                <OSButton
                    size="xs"
                    hover="background"
                    onClick={() => {
                        dismissAssistantNotice(notice.id)
                        onDone()
                    }}
                >
                    Dismiss
                </OSButton>
                <OSButton
                    size="xs"
                    hover="background"
                    onClick={() => {
                        muteAssistantTopic(notice.title)
                        dismissAssistantNotice(notice.id)
                        onDone()
                    }}
                >
                    Drop this
                </OSButton>
                <div className="ml-auto">
                    <OSButton size="xs" hover="background" onClick={onClose}>
                        Close
                    </OSButton>
                </div>
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
    const [notices, setNotices] = useState<AssistantNotice[]>(() => readAssistantNotices())
    const [openId, setOpenId] = useState<string | null>(initialNoticeId || null)

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
    const openNotice = openId ? mine.find((n) => n.id === openId) || getAssistantNotice(openId) : null

    return (
        <div className="@container h-full min-h-0 flex flex-col bg-primary text-primary">
            {!openNotice ? (
                <div className="flex items-center gap-3 px-3 py-2 border-b border-primary bg-primary shrink-0">
                    <div className="min-w-0 flex-1">
                        <p className="m-0 text-sm font-semibold truncate">{bot?.displayName || 'Assistant'}</p>
                    </div>
                    <CadenceBar />
                    <OSButton size="sm" hover="background" onClick={onChange}>
                        Change
                    </OSButton>
                </div>
            ) : null}

            <div className="flex flex-1 min-h-0 min-w-0 @2xl:flex-row flex-col">
                <div
                    className={`@container flex-1 min-h-0 min-w-0 text-sm overflow-hidden ${
                        openNotice ? 'hidden @2xl:block' : ''
                    }`}
                >
                    <ScrollArea className="h-full p-2">
                        {mine.length > 0 ? (
                            <ul className="list-none m-0 p-0 space-y-1">
                                {mine.map((notice) => (
                                    <NoticeRow
                                        key={notice.id}
                                        notice={notice}
                                        active={openId === notice.id}
                                        onOpen={() => setOpenId(notice.id)}
                                    />
                                ))}
                            </ul>
                        ) : (
                            <h5 className="m-0 px-2">You literally have no mail.</h5>
                        )}
                    </ScrollArea>
                </div>

                {openNotice ? (
                    <div className="relative min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden bg-primary @2xl:border-l border-t @2xl:border-t-0 border-primary">
                        <LetterThread
                            notice={openNotice}
                            philosopherId={philosopherId}
                            onClose={() => setOpenId(null)}
                            onDone={() => {
                                setOpenId(null)
                                setNotices(readAssistantNotices())
                            }}
                        />
                    </div>
                ) : null}
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
            <SEO title="Assistant" description="Mail from a resident philosopher." />
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
