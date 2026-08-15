import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useQuestions } from 'hooks/useQuestions'
import ScrollArea from 'components/RadixUI/ScrollArea'

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Question, QuestionForm } from 'components/Squeak'
import OSButton from 'components/OSButton'
import { IconSidePanel, IconBottomPanel, IconChevronDown, IconPin, IconCheck } from '@posthog/icons'
import Switch from 'components/RadixUI/Switch'
import { ToggleGroup } from 'components/RadixUI/ToggleGroup'
import { useToast } from '../../context/Toast'
import { QuestionData, StrapiRecord } from 'lib/strapi'
import { useUser } from 'hooks/useUser'
import hourglassAnimation from '../../images/icons8-hourglass.json'
import hourglassAnimationWhite from '../../images/icons8-hourglass-white.json'
import { useInView } from 'react-intersection-observer'

import { useWindow } from '../../context/Window'
import Tooltip from 'components/RadixUI/Tooltip'
import { flattenStrapiResponse } from '../../utils'
import { useApp, useAppActions } from '../../context/App'
import { Select } from 'components/RadixUI/Select'
import SEO from 'components/seo'
dayjs.extend(relativeTime)

// lottie-react bundles lottie-web (~600 KiB); load it on demand instead of on every page.
const Lottie = dynamic(() => import('lottie-react'), { ssr: false, loading: () => null })

/** Desktop OS navigate: reuse/update forum window (wimpos gatsby navigate equivalent). */
function useDesktopNavigate() {
    const { addWindow } = useAppActions()
    return (to: string, _options?: any) => {
        if (!to || typeof to !== 'string') return
        addWindow({
            key: to.startsWith('/questions') || to.startsWith('/forum') || to.startsWith('/community')
                ? 'forum-main-window'
                : to,
            path: to,
            title: to.split('/').filter(Boolean).pop() || 'Window',
        })
    }
}



const FORUM_TOPICS = [
    { id: 'all', name: 'All threads', match: [] as string[] },
    { id: 'technology', name: 'Technology', match: ['technolog', 'algorithm', 'software', 'machine', 'automat', 'ai ', 'digital', 'comput'] },
    { id: 'politics', name: 'Politics', match: ['politic', 'state', 'power', 'govern', 'sovereign', 'populist', ' grievan'] },
    { id: 'ethics', name: 'Ethics', match: ['ethic', 'moral', 'responsib', 'freedom', 'agency', 'will', 'choice'] },
    { id: 'aesthetics', name: 'Aesthetics', match: ['aesthetic', 'art', 'image', 'fiction', 'desire', 'beauty', 'style'] },
    { id: 'economy', name: 'Economy', match: ['econom', 'labor', 'capital', 'value', 'class', 'market', 'product'] },
    { id: 'metaphysics', name: 'Metaphysics', match: ['being', 'essence', 'ontolog', 'realit', 'existenc', 'metaphys'] },
    { id: 'culture', name: 'Culture', match: ['cultur', 'media', 'universit', 'archiv', 'language', 'symbol'] },
] as const

type ForumTopicId = (typeof FORUM_TOPICS)[number]['id']

function threadMatchesTopic(question: any, topicId: ForumTopicId) {
    if (topicId === 'all') return true
    const topic = FORUM_TOPICS.find((item) => item.id === topicId)
    if (!topic || topic.match.length === 0) return true
    const attrs = question?.attributes || question || {}
    const hay = `${attrs.subject || attrs.title || ''} ${attrs.body || attrs.content || ''}`.toLowerCase()
    return topic.match.some((needle) => hay.includes(needle))
}

const SIDE_WIDTH_DEFAULT = 600
const INBOX_NARROW_PX = 896

function inboxViewportWidth() {
    if (typeof window === 'undefined') return 0
    return window.visualViewport?.width || window.innerWidth || 0
}

function inboxBox(el: HTMLElement | null) {
    if (!el) return { w: 0, h: 0 }
    const r = el.getBoundingClientRect()
    return { w: r.width, h: r.height }
}

function inboxIsNarrow(appWidth: number | undefined, containerW: number) {
    const width = containerW > 0 ? containerW : appWidth && appWidth > 0 ? appWidth : inboxViewportWidth()
    return width > 0 && width < INBOX_NARROW_PX
}

interface QuestionRowProps {
    question: any
    lastQuestionRef: (node?: Element | null) => void
    appWindowPath?: string
    bottomHeight: number
    setBottomHeight: (height: number) => void
    containerRef: React.RefObject<HTMLDivElement>
    pinned?: boolean
    /** Direct open — does not rely on Link/addWindow path races */
    onOpenThread: (permalink: string) => void
}

const QuestionRow = ({
    question,
    lastQuestionRef,
    appWindowPath,
    bottomHeight,
    setBottomHeight,
    containerRef,
    pinned = false,
    onOpenThread,
}: QuestionRowProps) => {
    // Support both flat (wimpos) and Strapi attributes shapes
    const q = question?.attributes || question || {}
    const subject = q.subject || q.title || 'Community Discussion'
    const numReplies = q.numReplies || 0
    const activeAt = q.activeAt || q.createdAt || q.created_at
    const replies = q.replies
    const profile = q.profile?.data?.attributes || q.profile || {}
    const permalink = String(q.permalink || question.id || '')
    const resolved = q.resolved || false
    const replyList = Array.isArray(replies?.data) ? replies.data : Object.values(replies ?? {})
    const lastReply = replyList[replyList.length - 1]
    const latestAuthor =
        lastReply?.profile?.data?.attributes ||
        lastReply?.profile ||
        lastReply?.attributes?.profile ||
        profile
    const active = `/questions/${permalink}` === appWindowPath || appWindowPath?.endsWith(`/${permalink}`)
    const authorName = profile?.firstName
        ? `${profile.firstName} ${profile.lastName || ''}`.trim()
        : profile?.username || 'Community Member'

    return (
        <div key={question.id} ref={lastQuestionRef}>
            <OSButton
                align="left"
                width="full"
                hover="background"
                size="md"
                key={question.id}
                className={` 
                    flex-wrap @3xl:flex-nowrap !gap-0 @3xl:!gap-1 !items-start min-w-0
                    ${active ? 'font-bold bg-accent' : ''}
                    ${pinned ? 'bg-accent border-b border-primary' : ''}
                `}
                onClick={(e: any) => {
                    e?.preventDefault?.()
                    e?.stopPropagation?.()
                    if (!permalink) return
                    onOpenThread(permalink)
                    if (containerRef.current && bottomHeight < 200) {
                        setBottomHeight(Math.max(320, containerRef.current.getBoundingClientRect().height * 0.75))
                    }
                }}
            >
                <div
                    className={`shrink-0 w-7 @3xl:basis-auto basis-[5%] @3xl:block ${
                        pinned || resolved ? '' : 'hidden'
                    }`}
                >
                    {pinned ? (
                        <Tooltip trigger={<IconPin className="size-full max-w-5" />}>Pinned</Tooltip>
                    ) : resolved ? (
                        <Tooltip trigger={<IconCheck className="size-full max-w-5 text-green" />}>Resolved</Tooltip>
                    ) : null}
                </div>

                <div
                    className={`order-1 @3xl:order-none @3xl:w-48 @3xl:block @3xl:basis-auto ${
                        pinned || resolved ? 'basis-[65%]' : 'basis-[75%]'
                    }`}
                >
                    {authorName}
                    <span className="text-muted text-sm ml-1 @3xl:hidden">{numReplies}</span>
                </div>
                <div
                    className={`order-3 @3xl:order-none flex-[1_0_100%] @3xl:flex-1 min-w-0 break-words ${
                        active ? 'font-medium @3xl:font-bold' : 'font-medium'
                    }`}
                >
                    {subject}
                </div>
                <div className="hidden @3xl:block w-24 text-center">{numReplies}</div>
                <div
                    className={`order-2 min-w-0 truncate text-right @3xl:text-left @3xl:basis-auto @3xl:w-36 @4xl:w-52 font-normal ${
                        pinned || resolved ? 'basis-[30%]' : 'basis-[25%]'
                    }`}
                >
                    <Tooltip trigger={<span suppressHydrationWarning>{dayjs(activeAt).fromNow()}</span>}>
                        <span suppressHydrationWarning>
                            {dayjs(activeAt).format('dddd, MMMM D, YYYY')} at {dayjs(activeAt).format('h:mm A')}
                        </span>
                    </Tooltip>{' '}
                    <span className="hidden @3xl:inline-block">
                        by {latestAuthor?.firstName} {latestAuthor?.lastName}
                    </span>
                </div>
            </OSButton>
        </div>
    )
}

const layoutOptions = [
    {
        label: 'Stacked view',
        value: 'stacked',
        icon: <IconBottomPanel className="size-4" />,
    },
    {
        label: 'Side-by-side view',
        value: 'side-by-side',
        icon: <IconSidePanel className="size-4" />,
    },
]

interface QuestionToolbarProps {
    containerRef: React.RefObject<HTMLDivElement>
    bottomContainerRef: React.RefObject<HTMLDivElement>
    setBottomHeight: (height: number) => void
    question: StrapiRecord<QuestionData> | undefined
    user: any
    notificationsEnabled: boolean
    setNotificationsEnabled: (enabled: boolean) => void
    setSubscription: (params: { contentType: 'topic' | 'question'; id: string | number; subscribe: boolean }) => void
    addToast: (toast: any) => void
    sideBySide: boolean
    handleSideBySide: (sideBySide: boolean) => void
    expandable: boolean
    expandOrCollapse: (expandable: boolean) => void
    isMobile: boolean
    menuValue: string
    onCloseThread?: () => void
}

const QuestionToolbar = ({
    containerRef,
    bottomContainerRef,
    setBottomHeight,
    question,
    user,
    notificationsEnabled,
    setNotificationsEnabled,
    setSubscription,
    addToast,
    sideBySide,
    handleSideBySide,
    expandable,
    expandOrCollapse,
    isMobile,
    menuValue,
    onCloseThread,
}: QuestionToolbarProps) => {
    const navigate = useDesktopNavigate()
    return (
        <div className="bg-accent border-t border-primary px-4 py-2 flex gap-2 items-center sticky bottom-0 z-10">
            <OSButton
                variant="secondary"
                size="xs"
                onClick={() => {
                    if (!containerRef.current) return
                    const containerHeight = containerRef.current.getBoundingClientRect().height
                    setBottomHeight(containerHeight)
                    document.getElementById('question-form-button')?.click()
                    setTimeout(() => {
                        const viewport = bottomContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]')
                        viewport?.scrollTo({
                            top: viewport.scrollHeight,
                            behavior: 'smooth',
                        })
                    }, 300)
                }}
            >
                Reply
            </OSButton>
            <div className="ml-auto flex space-x-2">
                {question?.id && user && (
                    <Switch
                        checked={notificationsEnabled}
                        onChange={(checked) => {
                            setNotificationsEnabled(checked)
                            setSubscription({
                                contentType: 'question',
                                id: question.id,
                                subscribe: checked,
                            })
                            addToast({
                                description: checked
                                    ? "You'll be notified of replies by email."
                                    : "You won't receive notifications for this thread.",
                                title: checked ? 'Thread notifications enabled' : 'Thread notifications disabled',
                                onUndo: () => {
                                    setNotificationsEnabled(!checked)
                                    setSubscription({
                                        contentType: 'question',
                                        id: question.id,
                                        subscribe: !checked,
                                    })
                                },
                            })
                        }}
                        label="Thread notifications"
                    />
                )}

                <div className="ml-2 pl-2 border-l border-primary flex items-center gap-1">
                    <ToggleGroup
                        title="Layout"
                        hideTitle={true}
                        options={layoutOptions}
                        onValueChange={(value) => handleSideBySide(value === 'side-by-side')}
                        value={sideBySide ? 'side-by-side' : 'stacked'}
                        size="sm"
                    />
                    <Tooltip
                        trigger={
                            <span>
                                <OSButton
                                    size="sm"
                                    className="relative"
                                    style={{ width: 26, height: 26 }}
                                    icon={
                                        <IconChevronDown
                                            className={`w-6 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 ${
                                                sideBySide
                                                    ? expandable
                                                        ? 'rotate-90'
                                                        : '-rotate-90'
                                                    : expandable
                                                    ? 'rotate-180'
                                                    : ''
                                            }`}
                                        />
                                    }
                                    onClick={() => {
                                        if (isMobile && sideBySide) {
                                            if (onCloseThread) onCloseThread()
                                            else navigate(menuValue || '/questions')
                                        } else {
                                            expandOrCollapse(expandable)
                                        }
                                    }}
                                />
                            </span>
                        }
                    >
                        {expandable ? 'Expand' : 'Collapse'}
                    </Tooltip>
                </div>
            </div>
        </div>
    )
}

const ForumSidebar = ({
    selectedTopic,
    onSelectTopic,
    onSubmitQuestion,
}: {
    selectedTopic: ForumTopicId
    onSelectTopic: (id: ForumTopicId) => void
    onSubmitQuestion: () => void
}) => {
    const { addWindow } = useApp()

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="border-b border-primary px-2 pt-2 pb-2">
                <OSButton
                    variant="primary"
                    size="md"
                    width="full"
                    onClick={() =>
                        addWindow(
                            <AskAQuestion
                                newWindow
                                location={{ pathname: `ask-a-question` }}
                                key={`ask-a-question`}
                                onSubmit={onSubmitQuestion}
                            />
                        )
                    }
                >
                    Ask a question
                </OSButton>
            </div>
            <div className="@2xl:hidden">
                <Select
                    className="w-full border-none rounded-none"
                    placeholder="Topic"
                    value={selectedTopic}
                    onValueChange={(value) => onSelectTopic(value as ForumTopicId)}
                    groups={[
                        {
                            label: 'Topics',
                            items: FORUM_TOPICS.map((topic) => ({
                                label: topic.name,
                                value: topic.id,
                            })),
                        },
                    ]}
                />
            </div>
            <ScrollArea className="hidden @2xl:block flex-1 min-h-0 p-2">
                <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                    Topics
                </p>
                <div className="flex flex-col gap-px">
                    {FORUM_TOPICS.map((topic) => (
                        <OSButton
                            key={topic.id}
                            align="left"
                            width="full"
                            hover="background"
                            size="sm"
                            className={selectedTopic === topic.id ? 'font-semibold bg-accent' : ''}
                            onClick={() => onSelectTopic(topic.id)}
                        >
                            {topic.name}
                        </OSButton>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}

const AskAQuestion = ({ onSubmit }: { onSubmit: () => void }) => {
    const { addToast } = useToast()
    const { appWindow } = useWindow()
    const { closeWindow, setWindowTitle } = useApp()
    const navigate = useDesktopNavigate()

    useEffect(() => {
        setWindowTitle(appWindow, 'Ask a question')
    }, [])

    return (
        <div data-scheme="secondary" className="bg-primary size-full p-4">
            <QuestionForm
                onSubmit={(_values, _type, data) => {
                    onSubmit()
                    closeWindow(appWindow)
                    if (data?.attributes?.permalink) {
                        setTimeout(() => {
                            navigate(`/questions/${data.attributes.permalink}`)
                        }, 0)
                    }
                }}
                initialView="question-form"
                slug="/questions"
            />
        </div>
    )
}

/**
 * Thread slug only — not list, subscriptions, or topic routes.
 * Mirrors wimpos Gatsby `params.permalink` (absent on topic/list pages).
 */
export function extractQuestionPermalink(pathOrSlug?: string): string | undefined {
    if (!pathOrSlug) return undefined
    const raw = String(pathOrSlug).trim()
    // Already a bare slug
    if (raw && !raw.includes('/')) {
        if (raw === 'subscriptions' || raw === 'topic') return undefined
        return raw
    }
    const match = raw.match(/^\/?(?:questions|forum)\/(?!topic(?:\/|$)|subscriptions(?:\/|$))([^/?#]+)\/?$/)
    return match?.[1] || undefined
}

export default function Inbox(props) {
    const { data, params } = props
    const navigate = useDesktopNavigate()
    const { updateWindow } = useAppActions()
    const initialTopicID = data?.topic?.squeakId
    // Path-driven permalink from window path / props
    const pathPermalink =
        extractQuestionPermalink(props.permalink) ||
        extractQuestionPermalink(params?.permalink) ||
        extractQuestionPermalink(props.path) ||
        extractQuestionPermalink(typeof window !== 'undefined' ? window.location.pathname : undefined)
    // Local selection opens the panel immediately (does not wait for path/addWindow)
    const [activeThread, setActiveThread] = useState<string | undefined>(pathPermalink)
    const permalink = activeThread || pathPermalink
    const defaultFilters = {
        subject: {
            $ne: '',
        },
        slugs: {
            slug: {
                $notContainsi: '/community/profiles',
            },
        },
        topics: { id: { $eq: initialTopicID } },
    }
    const [ready, setReady] = useState(props.path !== '/questions/subscriptions')
    const [filters, setFilters] = useState(defaultFilters)
    const { addToast } = useToast()
    const { user, setSubscription, isSubscribed, isValidating } = useUser()
    const { questions, isLoading, isLoadingMore, fetchMore, hasMore, refresh, pinnedQuestions } = useQuestions({
        limit: 20,
        sortBy: 'activity',
        filters,
    })
    const { appWindow } = useWindow()
    const bottomHeightDefault = useMemo(
        () => Math.max(320, ((appWindow?.size?.height || 600) * 3) / 5),
        [appWindow?.size?.height]
    )
    const [bottomHeight, setBottomHeight] = useState(() => Math.max(320, bottomHeightDefault))
    const [sideWidth, setSideWidth] = useState(SIDE_WIDTH_DEFAULT)
    const [notificationsEnabled, setNotificationsEnabled] = useState(false)
    const [question, setQuestion] = useState<StrapiRecord<QuestionData>>()
    const containerRef = useRef<HTMLDivElement>(null)
    const bottomContainerRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragStartHeight, setDragStartHeight] = useState(0)
    const [dragStartWidth, setDragStartWidth] = useState(0)
    const [lastQuestionRef, inView] = useInView({ threshold: 0.1 })
    const [sideBySide, setSideBySide] = useState(false)
    const [menuValue, setMenuValue] = useState('/questions')
    const [selectedTopic, setSelectedTopic] = useState<ForumTopicId>('all')
    const [narrow, setNarrow] = useState(() =>
        inboxIsNarrow(appWindow?.size?.width, 0)
    )
    const isMobile = narrow

    // Keep local thread in sync when path changes externally (back/forward, topic nav)
    useEffect(() => {
        if (pathPermalink) {
            setActiveThread(pathPermalink)
        }
    }, [pathPermalink])

    const openThread = useCallback(
        (slug: string) => {
            const clean = String(slug || '')
                .replace(/^\/questions\/?/, '')
                .replace(/^\/+/, '')
            if (!clean) return
            const threadPath = `/questions/${clean}`
            // 1) Open panel immediately (local state — never wait on path)
            setActiveThread(clean)
            // 2) Always set a visible panel height (stacked mode)
            const box = inboxBox(containerRef.current)
            const nextH = box.h > 100 ? Math.min(box.h, Math.max(240, box.h * 0.72)) : 320
            setBottomHeight(nextH)
            if (sideBySide && box.w > 0) {
                setSideWidth(
                    inboxIsNarrow(appWindow?.size?.width, box.w)
                        ? box.w
                        : Math.min(SIDE_WIDTH_DEFAULT, Math.max(280, Math.min(box.w * 0.55, box.w - 200)))
                )
            }
            // 3) Sync window path after paint (stable key — no remount)
            if (appWindow) {
                updateWindow(appWindow, {
                    path: threadPath,
                    props: { ...(appWindow.props || {}), path: threadPath, permalink: clean },
                })
            }
            try {
                window.history.replaceState(
                    { windowKey: appWindow?.key || 'forum-main-window', forumThread: clean },
                    '',
                    threadPath
                )
            } catch {
                /* ignore */
            }
        },
        [appWindow, updateWindow, sideBySide]
    )

    const closeThread = useCallback(() => {
        setActiveThread(undefined)
        setQuestion(undefined)
        setBottomHeight(45)
        const listPath =
            menuValue && (menuValue.startsWith('/questions') || menuValue.startsWith('/forum'))
                ? menuValue
                : '/questions'
        if (appWindow) {
            updateWindow(appWindow, {
                path: listPath,
                props: { ...(appWindow.props || {}), path: listPath, permalink: undefined },
            })
        }
        try {
            window.history.replaceState({ windowKey: appWindow?.key || 'forum-main-window' }, '', listPath)
        } catch {
            /* ignore */
        }
    }, [appWindow, updateWindow, menuValue])

    const expandable = useMemo(() => {
        if (!containerRef.current) return true
        const containerRect = containerRef.current.getBoundingClientRect()
        if (sideBySide) {
            return isMobile ? sideWidth <= 0 : sideWidth <= 400
        } else {
            return bottomHeight <= containerRect.height / 2
        }
    }, [bottomHeight, sideWidth, sideBySide, containerRef.current, isMobile])

    const handleSideBySide = (next: boolean) => {
        setSideBySide(next)
        try {
            localStorage.setItem('sideBySide', next.toString())
        } catch {
            // private mode
        }
        const box = inboxBox(containerRef.current)
        if (next && box.w > 0) {
            setSideWidth(isMobile ? box.w : Math.min(SIDE_WIDTH_DEFAULT, Math.max(280, box.w * 0.55)))
        }
    }

    const expandOrCollapse = (expandable: boolean) => {
        if (!containerRef.current) return
        if (sideBySide) {
            const containerWidth = containerRef.current.getBoundingClientRect().width
            const minWidth = isMobile ? 0 : 400
            setSideWidth(expandable ? containerWidth : minWidth)
        } else {
            const containerHeight = containerRef.current.getBoundingClientRect().height
            const minHeight = 45
            setBottomHeight(expandable ? containerHeight : minHeight)
        }
    }

    const handleVerticalDrag = (_event, info) => {
        if (!containerRef.current) return
        const containerHeight = containerRef.current.getBoundingClientRect().height
        const newBottomHeight = Math.min(Math.max(dragStartHeight - info.offset.y, 45), containerHeight)
        setBottomHeight(newBottomHeight)
    }

    const handleHorizontalDrag = (_event, info) => {
        if (!containerRef.current) return
        const containerWidth = containerRef.current.getBoundingClientRect().width
        const minWidth = isMobile ? 0 : 280
        const newSideWidth = Math.min(Math.max(dragStartWidth - info.offset.x, minWidth), containerWidth)
        setSideWidth(newSideWidth)
    }

    useEffect(() => {
        if (inView && hasMore && !isLoading && !isLoadingMore) {
            void fetchMore()
        }
    }, [inView, hasMore, isLoading, isLoadingMore, fetchMore])

    useEffect(() => {
        if (initialTopicID && initialTopicID !== filters.topics?.id?.$eq) {
            const { id, ...newFilters } = filters
            setFilters({ ...newFilters, topics: { id: { $eq: initialTopicID } } })
        }
    }, [initialTopicID])

    useEffect(() => {
        if (user && question?.id) {
            isSubscribed('question', question.id).then((subscribed) => setNotificationsEnabled(subscribed))
        }
    }, [question, user])

    useEffect(() => {
        if (props.path === '/questions' || initialTopicID) {
            setFilters(defaultFilters)
        }
    }, [isValidating, props.path])

    const restoredSplit = useRef(false)
    useLayoutEffect(() => {
        const fit = () => {
            const box = inboxBox(containerRef.current)
            const nextNarrow = inboxIsNarrow(appWindow?.size?.width, box.w)
            setNarrow(nextNarrow)

            if (box.w > 0) {
                setSideWidth((w) => {
                    const next = nextNarrow ? Math.min(Math.max(w, 0), box.w) : Math.min(Math.max(w, 280), box.w)
                    return next === w ? w : next
                })
            }
            if (box.h > 0) {
                setBottomHeight((h) => {
                    const next = Math.min(Math.max(h, 160), box.h)
                    return next === h ? h : next
                })
            }
        }

        if (!restoredSplit.current) {
            restoredSplit.current = true
            try {
                setSideBySide(localStorage.getItem('sideBySide') === 'true')
            } catch {
                // private mode
            }
        }

        fit()
        const node = containerRef.current
        const ro = typeof ResizeObserver !== 'undefined' && node ? new ResizeObserver(fit) : null
        if (node) ro?.observe(node)
        window.addEventListener('resize', fit)
        window.visualViewport?.addEventListener('resize', fit)
        return () => {
            ro?.disconnect()
            window.removeEventListener('resize', fit)
            window.visualViewport?.removeEventListener('resize', fit)
        }
    }, [appWindow?.size?.width, appWindow?.size?.height, permalink, ready])

    return (
        <>
            <SEO title={(permalink && question?.attributes?.subject) || data?.topic?.label || 'Forums'} />
            {ready ? (
                <div
                    suppressHydrationWarning
                    className="@container w-full h-full min-h-0 flex flex-col bg-primary text-primary overflow-hidden"
                >
                    <div data-scheme="secondary" className={`flex @2xl:flex-row flex-col flex-1 min-h-0 overflow-hidden`}>
                        <aside
                            data-scheme="secondary"
                            className="w-full @2xl:w-64 bg-primary flex-shrink-0 @2xl:border-r border-primary @2xl:h-full @2xl:min-h-0"
                        >
                            <ForumSidebar
                                selectedTopic={selectedTopic}
                                onSelectTopic={setSelectedTopic}
                                onSubmitQuestion={refresh}
                            />
                        </aside>
                        <main
                            data-scheme="primary"
                            className="flex-1 min-h-0 bg-primary overflow-hidden @2xl:border-none border-t border-primary flex flex-col"
                        >
                            <div
                                ref={containerRef}
                                className={`flex flex-1 min-h-0 min-w-0 ${sideBySide ? 'flex-row' : 'flex-col'}`}
                            >
                                <div
                                    className={`@container flex-1 min-h-0 min-w-0 text-sm overflow-hidden ${
                                        sideBySide ? 'w-0' : 'w-full'
                                    }`}
                                >
                                    <ScrollArea className="h-full">
                                        <div className="flex items-center gap-2 pl-2.5 pr-24 py-2 border-b border-primary font-medium bg-accent text-sm bg-accent-2 sticky top-0 text-primary z-10 min-w-0">
                                            <div className="w-8 shrink-0 @3xl:block hidden" />
                                            <div className="hidden @3xl:block w-36 @4xl:w-48 shrink-0">Author</div>
                                            <div className="flex-1 min-w-0 truncate">
                                                <span className="@3xl:hidden">Author / Replies</span>
                                                <span className="hidden @3xl:block">Subject</span>
                                            </div>
                                            <div className="hidden @3xl:block w-16 text-center shrink-0">Replies</div>
                                            <div className="hidden @xl:block min-w-0 max-w-[9rem] @4xl:max-w-[14rem] text-right @3xl:text-left truncate">
                                                Last activity
                                            </div>
                                        </div>
                                        <div className="px-1 py-1 space-y-px">
                                            {pinnedQuestions
                                                ?.filter((question) => threadMatchesTopic(question, selectedTopic))
                                                .map((question) => (
                                                <QuestionRow
                                                    key={question.id}
                                                    question={question}
                                                    lastQuestionRef={() => undefined}
                                                    appWindowPath={appWindow?.path}
                                                    bottomHeight={bottomHeight}
                                                    setBottomHeight={setBottomHeight}
                                                    containerRef={containerRef}
                                                    pinned
                                                    onOpenThread={openThread}
                                                />
                                            ))}
                                            {flattenStrapiResponse(questions.data)
                                                ?.filter(
                                                    (question) =>
                                                        !question?.pinnedTopics?.[0] &&
                                                        threadMatchesTopic(question, selectedTopic)
                                                )
                                                ?.map((question, index, list) => (
                                                <QuestionRow
                                                    key={question.id}
                                                    question={question}
                                                    lastQuestionRef={index === list.length - 1 ? lastQuestionRef : () => undefined}
                                                    appWindowPath={appWindow?.path}
                                                    bottomHeight={bottomHeight}
                                                    setBottomHeight={setBottomHeight}
                                                    containerRef={containerRef}
                                                    onOpenThread={openThread}
                                                />
                                            ))}
                                            {!isLoading &&
                                                !(
                                                    pinnedQuestions?.some((question) =>
                                                        threadMatchesTopic(question, selectedTopic)
                                                    ) ||
                                                    flattenStrapiResponse(questions.data)?.some(
                                                        (question) =>
                                                            !question?.pinnedTopics?.[0] &&
                                                            threadMatchesTopic(question, selectedTopic)
                                                    )
                                                ) && (
                                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-primary">
                                                    <div className="text-lg mb-2 font-semibold">No threads here</div>
                                                    <div className="text-secondary text-sm">
                                                        There are no threads in this topic yet.
                                                    </div>
                                                </div>
                                            )}
                                            {(isLoading || isLoadingMore) && (
                                                <div className="flex items-center justify-center py-8">
                                                    <Suspense fallback={null}>
                                                        <Lottie
                                                            animationData={hourglassAnimation}
                                                            className="size-6 opacity-75 dark:hidden"
                                                            title="Loading questions..."
                                                        />
                                                        <Lottie
                                                            animationData={hourglassAnimationWhite}
                                                            className="size-6 opacity-75 hidden dark:block"
                                                            title="Loading questions..."
                                                        />
                                                    </Suspense>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                                {permalink ? (
                                        <div
                                            ref={bottomContainerRef}
                                            className={`relative min-h-0 min-w-0 flex flex-col overflow-hidden bg-primary ${
                                                !isDragging ? 'transition-[height,width] duration-200 ease-out' : ''
                                            } ${
                                                sideBySide ? '@4xl:border-l border-primary' : 'border-t border-primary'
                                            }`}
                                            style={
                                                sideBySide
                                                    ? {
                                                          width: isMobile ? sideWidth : Math.max(sideWidth, 280),
                                                          maxWidth: '100%',
                                                          height: '100%',
                                                          flex: '0 0 auto',
                                                      }
                                                    : {
                                                          height: Math.max(bottomHeight, isMobile ? 200 : 280),
                                                          width: '100%',
                                                          maxWidth: '100%',
                                                          flex: '0 0 auto',
                                                      }
                                            }
                                        >
                                            {sideBySide ? (
                                                <motion.div
                                                    data-scheme="tertiary"
                                                    className="w-1.5 cursor-ew-resize top-0 left-0 !transform-none absolute z-20 h-full hover:bg-accent active:bg-accent @4xl:block hidden"
                                                    drag="x"
                                                    dragMomentum={false}
                                                    dragConstraints={{ left: 0, right: 0 }}
                                                    onMouseDown={() => {
                                                        setIsDragging(true)
                                                        setDragStartWidth(sideWidth)
                                                    }}
                                                    onDragEnd={() => setIsDragging(false)}
                                                    onDrag={handleHorizontalDrag}
                                                    onDoubleClick={() => expandOrCollapse(expandable)}
                                                />
                                            ) : (
                                                <motion.div
                                                    data-scheme="tertiary"
                                                    className="h-1.5 cursor-ns-resize top-0 left-0 !transform-none absolute z-20 w-full hover:bg-accent active:bg-accent @4xl:block hidden"
                                                    drag="y"
                                                    dragMomentum={false}
                                                    dragConstraints={{ top: 0, bottom: 0 }}
                                                    onDragStart={() => {
                                                        setIsDragging(true)
                                                        setDragStartHeight(bottomHeight)
                                                    }}
                                                    onDragEnd={() => setIsDragging(false)}
                                                    onDrag={handleVerticalDrag}
                                                    onDoubleClick={() => expandOrCollapse(expandable)}
                                                />
                                            )}

                                            <ScrollArea className="min-w-0" viewportClasses="min-w-0">
                                                <div className="pb-[64px] min-w-0 max-w-full box-border">
                                                    <Question
                                                        key={permalink}
                                                        id={permalink}
                                                        onQuestionReady={(question) => setQuestion(question)}
                                                        subscribeButton={false}
                                                        showSlug
                                                        isInForum={true}
                                                        onPinTopics={refresh}
                                                    />
                                                </div>
                                            </ScrollArea>
                                            <QuestionToolbar
                                                containerRef={containerRef}
                                                bottomContainerRef={bottomContainerRef}
                                                setBottomHeight={setBottomHeight}
                                                question={question}
                                                user={user}
                                                notificationsEnabled={notificationsEnabled}
                                                setNotificationsEnabled={setNotificationsEnabled}
                                                setSubscription={setSubscription}
                                                addToast={addToast}
                                                sideBySide={sideBySide}
                                                handleSideBySide={handleSideBySide}
                                                expandable={expandable}
                                                expandOrCollapse={expandOrCollapse}
                                                isMobile={isMobile}
                                                menuValue={menuValue}
                                                onCloseThread={closeThread}
                                            />
                                        </div>
                                ) : null}
                            </div>
                        </main>
                    </div>
                </div>
            ) : null}
        </>
    )
}
