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
                    <OSButton variant="primary" size="md" width="full" onClick={() => setAskOpen(true)}>
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
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setAskOpen(false)
                    }}
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
}

const QuestionRow = ({
    question,
    lastQuestionRef,
    appWindowPath,
    bottomHeight,
    setBottomHeight,
    containerRef,
    pinned = false,
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
    const active = `/questions/${permalink}` === appWindowPath
    const authorName = profile?.firstName
        ? `${profile.firstName} ${profile.lastName || ''}`.trim()
        : profile?.username || 'Community Member'

    return (
        <div key={question.id} ref={lastQuestionRef}>
            <OSButton
                asLink
                to={`/questions/${permalink}`}
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
                    if (e && e.preventDefault) {
                        e.preventDefault()
                    }
                    if (typeof window !== 'undefined') {
                        window.history.pushState(null, '', `/questions/${permalink}`)
                        window.dispatchEvent(new Event('popstate'))
                    }
                    if (containerRef.current && bottomHeight <= 45) {
                        setBottomHeight(containerRef.current.getBoundingClientRect().height * 0.8)
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
                                            if (isMobile && sideBySide) {
                                                navigate(menuValue)
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
    const bottomHeightDefault = useMemo(
        () => Math.max(380, ((appWindow?.size?.height || 600) * 3) / 5),
        [appWindow?.size?.height]
    )
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
    const isMobile = useMemo(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 896) return true
        return (appWindow?.size?.width || (typeof window !== 'undefined' ? window.innerWidth : 1024)) < 896
    }, [appWindow?.size?.width])

    useEffect(() => {
        if (permalink) {
            if (bottomHeight <= 45) {
                const containerH = containerRef.current?.getBoundingClientRect().height || 500
                setBottomHeight(Math.max(350, containerH * 0.6))
            }
        }
    }, [permalink])

    const expandable = useMemo(() => {
        if (!containerRef.current) return true
        const containerRect = containerRef.current.getBoundingClientRect()
        if (sideBySide) {
            return isMobile ? sideWidth <= 0 : sideWidth <= 400
        } else {
            return bottomHeight <= containerRect.height / 2
        }
    }, [bottomHeight, sideWidth, sideBySide, containerRef.current, isMobile])

    const handleSideBySide = useCallback((nextSideBySide: boolean) => {
        setSideBySide((prev) => {
            if (prev !== nextSideBySide) {
                try {
                    localStorage.setItem('sideBySide', nextSideBySide.toString())
                } catch {}
                return nextSideBySide
            }
            return prev
        })
    }, [])

    const expandOrCollapse = useCallback(
        (expandable: boolean) => {
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
        },
        [sideBySide, isMobile]
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

    useEffect(() => {
        if (!containerRef.current) return

        if (sideBySide) {
            setSideWidth((prev) =>
                prev !== Math.max(400, SIDE_WIDTH_DEFAULT) ? Math.max(400, SIDE_WIDTH_DEFAULT) : prev
            )
        } else {
            setBottomHeight((prev) => (prev !== bottomHeightDefault ? bottomHeightDefault : prev))
        }
    }, [sideBySide, bottomHeightDefault])

    useEffect(() => {
        if (isMobile && sideBySide && containerRef.current) {
            setSideWidth(containerRef.current.getBoundingClientRect().width)
        }
    }, [isMobile, sideBySide, containerRef.current, appWindow?.size.width])

    return (
        <>
            <SEO title={(permalink && question?.attributes.subject) || data?.topic?.label || 'Forums'} />
            {ready ? (
                <div
                    suppressHydrationWarning
                    className="@container w-full h-full flex flex-col bg-[#fdfdf8] dark:bg-[#1b1c1e] text-primary"
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
                                    {permalink && (
                                        <motion.div
                                            ref={bottomContainerRef}
                                            className={`flex-none relative min-h-0 min-w-0 ${
                                                !isDragging ? 'transition-all duration-200 ease-out' : ''
                                            } ${
                                                sideBySide ? '@4xl:border-l border-primary' : 'border-t border-primary'
                                            }`}
                                            initial={{
                                                width: 0,
                                            }}
                                            animate={{
                                                height: sideBySide ? '100%' : bottomHeight,
                                                width: sideBySide ? sideWidth : '100%',
                                            }}
                                            exit={{
                                                width: 0,
                                            }}
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
