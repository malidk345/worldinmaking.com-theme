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
        <div className="flex items-center gap-1.5 flex-wrap">
            {(['rare', 'normal', 'nag'] as CadenceMode[]).map((item) => (
                <OSButton
                    key={item}
                    size="sm"
                    hover="background"
                    active={mode === item}
                    onClick={() => set(item)}
                >
                    {item === 'rare' ? 'Rare' : item === 'nag' ? 'Nag' : 'Normal'}
                </OSButton>
            ))}
            <OSButton
                size="sm"
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
            <span className="text-[11px] text-muted">{cadenceIntervals(mode).maxUnread} unread max</span>
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
                            A resident philosopher takes the desk. They read your notebooks, scratchpad, chats, and
                            forum posts, then nag you from the notification panel until you answer.
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

function NoticeRow({ notice, onOpen }: { notice: AssistantNotice; onOpen: () => void }) {
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
        </li>
    )
}

function DetailScreen({
    notice,
    philosopherId,
    onBack,
    onDone,
}: {
    notice: AssistantNotice
    philosopherId: PersonalAssistantId
    onBack: () => void
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
        <div className="h-full min-h-0 flex flex-col">
            <div className="flex items-center gap-3 px-3 py-2 border-b border-primary bg-primary shrink-0">
                <OSButton size="sm" hover="background" onClick={onBack}>
                    Back
                </OSButton>
                <span className="size-9 shrink-0 rounded-md border border-primary bg-accent/30 overflow-hidden flex items-center justify-center">
                    {portrait ? (
                        <img src={portrait} alt="" width={36} height={36} className="size-9 object-contain" />
                    ) : null}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-semibold truncate">{bot?.displayName || 'Assistant'}</p>
                    <p className="m-0 text-xs text-muted truncate">
                        {notice.count} · {dayjs(notice.date).fromNow()}
                    </p>
                </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 max-w-xl mx-auto space-y-4">
                    <div>
                        <div className="text-xs text-muted">{notice.excerpt}</div>
                        <h2 className="text-lg font-semibold m-0 mt-1">{notice.title}</h2>
                        {notice.body ? <p className="text-sm text-secondary mt-2 mb-0">{notice.body}</p> : null}
                        {notebook ? (
                            <p className="text-xs text-muted mt-2 mb-0">From notebook “{notebook.title}”</p>
                        ) : null}
                        {notice.actionLabel ? (
                            <p className="text-xs text-secondary mt-2 mb-0">{notice.actionLabel}</p>
                        ) : null}
                    </div>
                    <AssistantReply
                        answering={answering}
                        onAnswer={(text) => void submit(text)}
                        onDismiss={() => {
                            dismissAssistantNotice(notice.id)
                            onDone()
                        }}
                    />
                    <OSButton
                        size="sm"
                        hover="background"
                        onClick={() => {
                            muteAssistantTopic(notice.title)
                            dismissAssistantNotice(notice.id)
                            onDone()
                        }}
                    >
                        Drop this topic
                    </OSButton>
                </div>
            </ScrollArea>
        </div>
    )
}

function BriefingScreen({
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
    const notebooks = useMemo(() => collectUserNotebooks(), [notices.length])

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
    const watching = notebooks.length
    const openNotice = openId ? mine.find((n) => n.id === openId) || getAssistantNotice(openId) : null

    if (openNotice) {
        return (
            <DetailScreen
                notice={openNotice}
                philosopherId={philosopherId}
                onBack={() => setOpenId(null)}
                onDone={() => {
                    setOpenId(null)
                    setNotices(readAssistantNotices())
                }}
            />
        )
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
            <div className="px-3 py-2 border-b border-primary shrink-0">
                <CadenceBar />
            </div>

            <div className="flex-1 min-h-0">
                <ScrollArea className="p-2 h-full">
                    {mine.length > 0 ? (
                        <ul className="list-none m-0 p-0 space-y-1 max-w-xl mx-auto">
                            {mine.map((notice) => (
                                <NoticeRow
                                    key={notice.id}
                                    notice={notice}
                                    onOpen={() => setOpenId(notice.id)}
                                />
                            ))}
                        </ul>
                    ) : (
                        <h5 className="m-0 px-2">
                            {bot?.name || 'Your assistant'} is reading. Notices will land here and in the notification
                            panel. Click one to open the detail and write back.
                        </h5>
                    )}
                </ScrollArea>
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
                description="A resident philosopher reads your notebooks, counsels you, and nags you from the notification panel."
            />
            {!ready ? <div className="flex-1" /> : null}
            {ready && (picking || !assistantId) ? (
                <PickerScreen currentId={assistantId} onChoose={choose} />
            ) : null}
            {ready && assistantId && !picking ? (
                <BriefingScreen
                    philosopherId={assistantId}
                    onChange={() => setPicking(true)}
                    initialNoticeId={pathNoticeId}
                />
            ) : null}
        </div>
    )
}

export default AssistantWindow
