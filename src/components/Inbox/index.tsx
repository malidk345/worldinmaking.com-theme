import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState, useMemo, useCallback, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuestions } from 'hooks/useQuestions'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { TreeMenu } from 'components/TreeMenu'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Question, QuestionForm } from 'components/Squeak'
import OSButton from 'components/OSButton'
import { IconSidePanel, IconBottomPanel, IconChevronDown, IconNotification, IconPin, IconCheck } from '@posthog/icons'
import Switch from 'components/RadixUI/Switch'
import { ToggleGroup } from 'components/RadixUI/ToggleGroup'
import { useToast } from '../../context/Toast'
import { QuestionData, StrapiRecord } from 'lib/strapi'
import { useUser } from 'hooks/useUser'
import hourglassAnimation from '../../images/icons8-hourglass.json'
import hourglassAnimationWhite from '../../images/icons8-hourglass-white.json'
import { useInView } from 'react-intersection-observer'
import useTopicsNav from '../../navs/useTopicsNav'
import { useWindow } from '../../context/Window'
import Tooltip from 'components/RadixUI/Tooltip'
import { DebugContainerQuery } from 'components/DebugContainerQuery'
import { useSubscribedQuestions } from 'hooks/useSubscribedQuestions'
import { flattenStrapiResponse } from '../../utils'
import { useApp } from '../../context/App'
import Link from 'components/Link'
import { Select } from 'components/RadixUI/Select'
import SEO from 'components/seo'
import SearchProvider, { useSearch } from 'components/Editor/SearchProvider'
import { InlineSearch, AlgoliaSearchResults } from 'components/Search/InlineSearch'
dayjs.extend(relativeTime)

import dynamic from 'next/dynamic'

// lottie-react bundles lottie-web (~600 KiB); load it on demand instead of on every page.
const Lottie = dynamic(() => import('lottie-react'), { ssr: false, loading: () => null })

const Menu = ({ onValueChange }: { onValueChange: (value: string) => void }) => {
    const { user } = useUser()
    const topicsNav = useTopicsNav()
    const { appWindow } = useWindow()
    const router = useRouter()
    const navigate = (to: string, options?: any) => {
        if (typeof window !== 'undefined') {
            if (options?.replace) {
                router.replace(to)
            } else {
                router.push(to)
            }
        }
    }

    const filteredTopicsNav = useMemo(() => {
        return [
            ...(user
                ? [
                      {
                          name: 'My subscriptions',
                          url: '/questions/subscriptions',
                          icon: <IconNotification />,
                      },
                  ]
                : []),
            ...topicsNav,
        ]
    }, [topicsNav])

    const defaultValue = useMemo(() => {
        return filteredTopicsNav.find((topic) => topic.url === appWindow?.path)?.url || filteredTopicsNav[0]?.url
    }, [appWindow?.path])

    useEffect(() => {
        onValueChange(defaultValue)
    }, [])

    return (
        <>
            <div className="@2xl:hidden">
                <Select
                    className="w-full border-none rounded-none"
                    placeholder="Navigate to a topic"
                    defaultValue={defaultValue}
                    onValueChange={(value) => {
                        onValueChange(value)
                        navigate(value)
                    }}
                    groups={[
                        {
                            label: 'Topics',
                            items: filteredTopicsNav.map((topic) => ({
                                label: topic.name,
                                value: topic.url,
                            })),
                        },
                    ]}
                />
            </div>

            <div className="hidden @2xl:block">
                <ScrollArea className="p-2">
                    <TreeMenu key={user?.id} watchPath={false} items={filteredTopicsNav} />
                </ScrollArea>
            </div>
        </>
    )
}

const SidebarContent = ({
    onMenuValueChange,
    onSubmitQuestion,
}: {
    onMenuValueChange: (value: string) => void
    onSubmitQuestion: () => void
}) => {
    const { searchQuery } = useSearch()
    const isSearching = searchQuery.length >= 2
    const [askOpen, setAskOpen] = useState(false)
    const router = useRouter()
    const navigate = (to: string, options?: any) => {
        if (typeof window !== 'undefined') {
            if (options?.replace) {
                router.replace(to)
            } else {
                router.push(to)
            }
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-primary">
                <div className="px-2 mt-2 pb-2">
                    <OSButton
                        variant="primary"
                        size="md"
                        width="full"
                        onClick={() => setAskOpen(true)}
                    >
                        Ask a question
                    </OSButton>
                </div>
            </div>
            <ScrollArea className="h-full">
                <InlineSearch
                    placeholder="Search questions..."
                    className="p-2 @2xl:pb-0 @2xl:border-b-0 border-b border-primary"
                />
                {isSearching ? (
                    <div className="p-2">
                        <AlgoliaSearchResults facetFilters={['type:question']} />
                    </div>
                ) : (
                    <Menu onValueChange={onMenuValueChange} />
                )}
            </ScrollArea>

            {/* Ask a question modal */}
            {askOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    onClick={(e) => { if (e.target === e.currentTarget) setAskOpen(false) }}
                >
                    <div className="absolute inset-0 bg-black/50" />
                    <div
                        className="relative z-10 bg-accent border border-primary rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-primary">
                            <h2 className="font-bold text-base">Ask a question</h2>
                            <button
                                onClick={() => setAskOpen(false)}
                                className="text-primary hover:text-primary/70 transition-colors text-xl leading-none"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-4">
                            <QuestionForm
                                showTopicSelector
                                disclaimer={false}
                                onSubmit={(_values, _type, data) => {
                                    setAskOpen(false)
                                    onSubmitQuestion()
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
                    </div>
                </div>
            )}
        </div>
    )
}

const SIDE_WIDTH_DEFAULT = 600

interface QuestionRowProps {
    question: any
    lastQuestionRef: (node?: Element | null) => void
    appWindowPath?: string
    bottomHeight: number
    setBottomHeight: (height: number) => void
    containerRef: React.RefObject<HTMLDivElement>
    pinned?: boolean
    /** Open thread detail panel (must set local + window path so React re-renders) */
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
    const q = question?.attributes || question || {}
    const subject = q.subject || q.title || 'Community Discussion'
    const numReplies = q.numReplies || 0
    const activeAt = q.activeAt || q.createdAt || q.created_at
    const replies = q.replies
    const profile = q.profile?.data?.attributes || q.profile || {}
    const permalink = q.permalink || String(question.id)
    const resolved = q.resolved || false

    const replyList = Array.isArray(replies?.data) ? replies.data : Object.values(replies ?? {})
    const lastReply = replyList[replyList.length - 1]
    const latestAuthor = lastReply?.profile || lastReply?.attributes?.profile || profile
    const threadPath = `/questions/${permalink}`
    const active = threadPath === appWindowPath || appWindowPath?.endsWith(`/${permalink}`)
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
                    flex-wrap @3xl:flex-nowrap !gap-0 @3xl:!gap-1 !items-start
                    ${active ? 'font-bold bg-accent' : ''}
                    ${pinned ? 'bg-accent border-b border-primary' : ''}
                `}
                onClick={(e: any) => {
                    // Plain button (not asLink) — Next Link was racing pushState and
                    // collapsing the detail panel right after open.
                    e?.preventDefault?.()
                    e?.stopPropagation?.()
                    onOpenThread(String(permalink))
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
                    className={`order-3 @3xl:order-none flex-[1_0_100%] @3xl:flex-1 ${
                        active ? 'font-medium @3xl:font-bold' : 'font-medium'
                    }`}
                >
                    {subject}
                </div>
                <div className="hidden @3xl:block w-24 text-center">{numReplies}</div>
                <div
                    className={`order-2 text-right @3xl:text-left @3xl:basis-auto @3xl:w-60 font-normal ${
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

const QuestionToolbar = React.memo(
    ({
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
        const router = useRouter()
        const navigate = (to: string, options?: any) => {
            if (typeof window !== 'undefined') {
                if (options?.replace) {
                    router.replace(to)
                } else {
                    router.push(to)
                }
            }
        }
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
                            const viewport = bottomContainerRef.current?.querySelector(
                                '[data-radix-scroll-area-viewport]'
                            )
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
                                            // Always expand/collapse — never auto-close the thread
                                            // (mobile side-by-side close was making the panel vanish)
                                            expandOrCollapse(expandable)
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
)
QuestionToolbar.displayName = 'QuestionToolbar'

const AskAQuestion = ({ onSubmit }: { onSubmit: () => void }) => {
    const router = useRouter()
    const navigate = (to: string, options?: any) => {
        if (typeof window !== 'undefined') {
            if (options?.replace) {
                router.replace(to)
            } else {
                router.push(to)
            }
        }
    }
    const { addToast } = useToast()
    const { appWindow } = useWindow()
    const { closeWindow, setWindowTitle } = useApp()

    useEffect(() => {
        setWindowTitle(appWindow, 'Ask a question')
    }, [])

    return (
        <div data-scheme="secondary" className="bg-primary size-full p-4">
            <QuestionForm
                showTopicSelector
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

export default function Inbox(props) {
    const router = useRouter()
    const navigate = (to: string, options?: any) => {
        if (typeof window !== 'undefined') {
            if (options?.replace) {
                router.replace(to)
            } else {
                router.push(to)
            }
        }
    }
    const { data, params } = props
    const initialTopicID = data?.topic?.squeakId
    const permalink =
        props.permalink ||
        params?.permalink ||
        (props.path &&
        props.path !== '/questions' &&
        props.path !== '/questions/subscriptions' &&
        props.path.startsWith('/questions/')
            ? props.path.replace(/^\/questions\/?/, '')
            : undefined) ||
        (typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/questions/') &&
        window.location.pathname !== '/questions'
            ? window.location.pathname.replace(/^\/questions\/?/, '')
            : undefined)
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
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])
    const [ready, setReady] = useState(props.path !== '/questions/subscriptions')
    const [filters, setFilters] = useState(defaultFilters)
    const { addToast } = useToast()
    const { user, setSubscription, isSubscribed, isValidating } = useUser()
    const { questions, isLoading, fetchMore, hasMore, refresh, pinnedQuestions } = useQuestions({
        limit: 20,
        sortBy: 'activity',
        filters,
    })
    const { appWindow } = useWindow()
    const { updateWindow } = useApp()
    const bottomHeightDefault = useMemo(() => Math.max(380, ((appWindow?.size?.height || 600) * 3) / 5), [appWindow?.size?.height])
    const [bottomHeight, setBottomHeight] = useState(bottomHeightDefault)
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
    const [showSubscribedQuestions, setShowSubscribedQuestions] = useState(false)
    const { questions: subscribedQuestions } = useSubscribedQuestions()
    const [menuValue, setMenuValue] = useState('')
    // Local open-thread state — must not rely only on pushState (no React re-render)
    const [activeThread, setActiveThread] = useState<string | undefined>(permalink || undefined)
    // Sticky ref survives transient prop clears so the panel does not vanish mid-open
    const activeThreadRef = useRef<string | undefined>(activeThread)
    activeThreadRef.current = activeThread

    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false
        return window.innerWidth < 896 || (appWindow?.size?.width || 1024) < 896
    })
    useEffect(() => {
        const check = () => {
            const w = appWindow?.size?.width || window.innerWidth
            setIsMobile(window.innerWidth < 896 || w < 896)
        }
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [appWindow?.size?.width])

    // Prefer explicit selection; fall back to props/URL-derived permalink
    const openPermalink = activeThread || permalink

    const handleSideBySide = useCallback((nextSideBySide: boolean) => {
        setSideBySide((prev) => {
            if (prev !== nextSideBySide) {
                try {
                    localStorage.setItem('sideBySide', nextSideBySide.toString())
                } catch {
                    /* ignore */
                }
                return nextSideBySide
            }
            return prev
        })
    }, [])

    const liftPanel = useCallback(() => {
        if (!containerRef.current) return
        const h = containerRef.current.getBoundingClientRect().height || 500
        if (sideBySide && !isMobile) {
            const w = containerRef.current.getBoundingClientRect().width
            setSideWidth(Math.max(SIDE_WIDTH_DEFAULT, Math.min(w * 0.55, w - 280)))
        } else {
            const ratio = isMobile ? 0.82 : 0.62
            const minH = isMobile ? 300 : 360
            // Never leave the panel at the 45px "collapsed chrome" height while a thread is open
            setBottomHeight(Math.max(minH, h * ratio))
        }
    }, [isMobile, sideBySide])

    const openThread = useCallback(
        (slug: string) => {
            const clean = String(slug || '')
                .replace(/^\/questions\/?/, '')
                .replace(/^\/+/, '')
                .replace(/^\/forum\/?/, '')
                .replace(/^\/community\/?/, '')
            if (!clean) return
            const threadPath = `/questions/${clean}`
            setActiveThread(clean)
            activeThreadRef.current = clean
            // Mobile: stacked panel only — side-by-side was closing on expand toggle
            if (isMobile) {
                setSideBySide(false)
                try {
                    localStorage.setItem('sideBySide', 'false')
                } catch {
                    /* ignore */
                }
            }
            if (appWindow) {
                updateWindow(appWindow, {
                    path: threadPath,
                    props: { ...(appWindow.props || {}), path: threadPath, permalink: clean },
                })
            }
            if (typeof window !== 'undefined') {
                try {
                    // replaceState avoids stacking history entries that Next may fight
                    window.history.replaceState(
                        { windowKey: appWindow?.key || 'forum-main-window', forumThread: clean },
                        '',
                        threadPath
                    )
                } catch {
                    /* ignore */
                }
            }
            requestAnimationFrame(() => liftPanel())
        },
        [appWindow, updateWindow, isMobile, liftPanel]
    )

    // Sync from external navigation (window path / props) — never clear open thread here
    useEffect(() => {
        if (permalink && permalink !== activeThreadRef.current) {
            setActiveThread(permalink)
            activeThreadRef.current = permalink
            requestAnimationFrame(() => liftPanel())
        }
    }, [permalink, liftPanel])

    // Ensure an open thread always has usable panel size
    useEffect(() => {
        if (!openPermalink) return
        if (!sideBySide && bottomHeight < 120) {
            liftPanel()
        }
        if (sideBySide && sideWidth < 200 && !isMobile) {
            liftPanel()
        }
    }, [openPermalink, bottomHeight, sideWidth, sideBySide, isMobile, liftPanel])

    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
    useEffect(() => {
        const el = containerRef.current
        if (!el || typeof ResizeObserver === 'undefined') return
        const ro = new ResizeObserver((entries) => {
            const cr = entries[0]?.contentRect
            if (!cr) return
            setContainerSize({ w: cr.width, h: cr.height })
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const expandable = useMemo(() => {
        if (sideBySide) {
            if (isMobile) return sideWidth <= containerSize.w * 0.5
            return sideWidth <= Math.max(400, containerSize.w * 0.45)
        }
        const half = (containerSize.h || 500) / 2
        return bottomHeight <= half
    }, [bottomHeight, sideWidth, sideBySide, isMobile, containerSize])

    const expandOrCollapse = useCallback(
        (expandable: boolean) => {
            if (!containerRef.current) return
            if (sideBySide) {
                const containerWidth = containerRef.current.getBoundingClientRect().width
                const minWidth = isMobile ? 0 : 400
                setSideWidth(expandable ? containerWidth : minWidth)
            } else {
                const containerHeight = containerRef.current.getBoundingClientRect().height
                // Keep enough height for the toolbar when "collapsed" so controls don't vanish
                const minHeight = openPermalink ? 140 : 45
                setBottomHeight(expandable ? containerHeight : minHeight)
            }
        },
        [sideBySide, isMobile, openPermalink]
    )

    const handleVerticalDrag = (_event, info) => {
        if (!containerRef.current) return
        const containerHeight = containerRef.current.getBoundingClientRect().height
        const newBottomHeight = Math.min(Math.max(dragStartHeight - info.offset.y, 45), containerHeight)
        setBottomHeight(newBottomHeight)
    }

    const handleHorizontalDrag = (_event, info) => {
        if (!containerRef.current) return
        const containerWidth = containerRef.current.getBoundingClientRect().width
        const newSideWidth = Math.min(Math.max(dragStartWidth - info.offset.x, 400), containerWidth)
        setSideWidth(newSideWidth)
    }

    useEffect(() => {
        if (inView && hasMore) {
            fetchMore()
        }
    }, [inView, hasMore])

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
        if (props.path === '/questions/subscriptions') {
            if (user) {
                setShowSubscribedQuestions(true)
            } else {
                navigate('/questions')
            }
            setReady(true)
        } else if (props.path === '/questions' || initialTopicID) {
            setShowSubscribedQuestions(false)
            setFilters(defaultFilters)
        }
    }, [isValidating, props.path])

    useEffect(() => {
        const sideBySideVal = localStorage.getItem('sideBySide')
        if (sideBySideVal) {
            setSideBySide(sideBySideVal === 'true')
        }
    }, [])

    // Only reset layout dimensions when the user toggles stacked ↔ side-by-side.
    // Previously this also re-ran on bottomHeightDefault (window resize) and fought
    // openThread's liftPanel — panel would flash open then collapse.
    const prevSideBySide = useRef(sideBySide)
    useEffect(() => {
        if (prevSideBySide.current === sideBySide) return
        prevSideBySide.current = sideBySide
        if (!containerRef.current) return
        if (sideBySide) {
            if (isMobile) {
                setSideWidth(containerRef.current.getBoundingClientRect().width)
            } else {
                setSideWidth(Math.max(400, SIDE_WIDTH_DEFAULT))
            }
        } else if (openPermalink) {
            liftPanel()
        } else {
            setBottomHeight(45)
        }
    }, [sideBySide, isMobile, openPermalink, liftPanel])

    // Force stacked on narrow viewports so expand/collapse chrome stays stable
    useEffect(() => {
        if (isMobile && sideBySide) {
            handleSideBySide(false)
        }
    }, [isMobile, sideBySide, handleSideBySide])

    return (
        <>
            <SEO title={(permalink && question?.attributes.subject) || data?.topic?.label || 'Forums'} />
            {ready ? (
                <div
                    suppressHydrationWarning
                    className="@container w-full h-full flex flex-col bg-primary text-primary"
                >
                    <div data-scheme="secondary" className={`flex @2xl:flex-row flex-col flex-grow min-h-0`}>
                        <aside
                            data-scheme="secondary"
                            className="w-full @2xl:w-64 bg-primary flex-shrink-0 @2xl:border-r border-primary @2xl:h-full"
                        >
                            <SearchProvider>
                                <SidebarContent onMenuValueChange={setMenuValue} onSubmitQuestion={refresh} />
                            </SearchProvider>
                        </aside>
                        <main
                            data-scheme="primary"
                            className="flex-1 bg-primary overflow-hidden border-primary @2xl:border-none border-t"
                        >
                            <div
                                ref={containerRef}
                                className={`flex flex-row h-full ${sideBySide ? 'flex-row' : 'flex-col'}`}
                            >
                                <div className={`@container flex-1 min-h-0 text-sm ${sideBySide ? 'w-0' : 'w-full'}`}>
                                    <ScrollArea className="h-full">
                                        <div className="flex items-center pl-2.5 pr-4 py-2 border-b border-primary font-medium bg-accent text-sm bg-accent-2 sticky top-0 text-primary z-10 whitespace-nowrap">
                                            <div className="w-8 shrink-0 @3xl:block hidden" />
                                            <div className="hidden @3xl:block w-48">Author</div>
                                            <div className="flex-1">
                                                <span className="@3xl:hidden">Author / Replies</span>
                                                <span className="hidden @3xl:block">Subject</span>
                                            </div>
                                            <div className="hidden @3xl:block w-24 text-center">Replies</div>
                                            <div className="w-60 text-right @3xl:text-left">Last activity</div>
                                        </div>
                                        <div className="px-1 py-1 space-y-px">
                                            {pinnedQuestions?.map((question) => (
                                                <QuestionRow
                                                    key={question.id}
                                                    question={question}
                                                    lastQuestionRef={lastQuestionRef}
                                                    appWindowPath={appWindow?.path}
                                                    bottomHeight={bottomHeight}
                                                    setBottomHeight={setBottomHeight}
                                                    containerRef={containerRef}
                                                    pinned
                                                    onOpenThread={openThread}
                                                />
                                            ))}
                                            {(showSubscribedQuestions
                                                ? subscribedQuestions
                                                : flattenStrapiResponse(questions.data)?.filter(
                                                      (question) => !question?.pinnedTopics?.[0]
                                                  )
                                            )?.map((question) => (
                                                <QuestionRow
                                                    key={question.id}
                                                    question={question}
                                                    lastQuestionRef={lastQuestionRef}
                                                    appWindowPath={appWindow?.path}
                                                    bottomHeight={bottomHeight}
                                                    setBottomHeight={setBottomHeight}
                                                    containerRef={containerRef}
                                                    onOpenThread={openThread}
                                                />
                                            ))}
                                            {!isLoading && (!questions.data || questions.data.length === 0) && (
                                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-primary">
                                                    <div className="text-lg mb-2 font-semibold">No questions found</div>
                                                    <div className="text-secondary text-sm">
                                                        {props.path === '/questions/subscriptions'
                                                            ? "You haven't subscribed to any questions yet."
                                                            : 'There are no questions in this topic yet.'}
                                                    </div>
                                                </div>
                                            )}
                                            {isLoading && mounted && (
                                                <div className="flex items-center justify-center py-8 h-full">
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
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                                <AnimatePresence>
                                    {openPermalink && (
                                        <motion.div
                                            ref={bottomContainerRef}
                                            className={`flex-none relative min-h-0 min-w-0 ${
                                                !isDragging ? 'transition-all duration-200 ease-out' : ''
                                            } ${
                                                sideBySide ? '@4xl:border-l border-primary' : 'border-t border-primary'
                                            }`}
                                            initial={
                                                sideBySide
                                                    ? { width: 0 }
                                                    : { height: 0, opacity: 0.6 }
                                            }
                                            animate={{
                                                height: sideBySide ? '100%' : bottomHeight,
                                                width: sideBySide ? sideWidth : '100%',
                                                opacity: 1,
                                            }}
                                            exit={
                                                sideBySide
                                                    ? { width: 0 }
                                                    : { height: 0, opacity: 0 }
                                            }
                                            transition={{
                                                type: 'tween',
                                                ...(isDragging ? { duration: 0 } : {}),
                                            }}
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

                                            <ScrollArea>
                                                <div className="pb-[64px]">
                                                    <Question
                                                        key={openPermalink}
                                                        id={openPermalink}
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
                                                onCloseThread={() => {
                                                    setActiveThread(undefined)
                                                    activeThreadRef.current = undefined
                                                    setBottomHeight(45)
                                                    setQuestion(undefined)
                                                    if (appWindow) {
                                                        const listPath =
                                                            menuValue && menuValue.startsWith('/questions')
                                                                ? menuValue
                                                                : '/questions'
                                                        updateWindow(appWindow, {
                                                            path: listPath,
                                                            props: {
                                                                ...(appWindow.props || {}),
                                                                path: listPath,
                                                                permalink: undefined,
                                                            },
                                                        })
                                                    }
                                                    try {
                                                        const listPath =
                                                            menuValue && menuValue.startsWith('/questions')
                                                                ? menuValue
                                                                : '/questions'
                                                        window.history.replaceState(
                                                            { windowKey: appWindow?.key || 'forum-main-window' },
                                                            '',
                                                            listPath
                                                        )
                                                    } catch {
                                                        /* ignore */
                                                    }
                                                }}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </main>
                    </div>
                </div>
            ) : null}
        </>
    )
}
