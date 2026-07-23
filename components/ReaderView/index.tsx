"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import ScrollArea from 'components/RadixUI/ScrollArea'
import FooterBar from '../OSChrome/FooterBar'
import { TreeMenu } from '../TreeMenu'
import { ReaderViewProvider, useReaderView } from './context/ReaderViewContext'
import { TableOfContents, type TableOfContentsItem } from './TableOfContents'
import CommentSection from '../Community/CommentSection'
import { getProseClasses } from '../../constants/index'
import { InPageSearchProvider } from 'components/Search/InPageSearchContext'
import { usePosts } from 'hooks/usePosts'
import { useAuth } from 'context/AuthContext'
import { useToast } from 'context/ToastContext'
import { useTranslation } from 'hooks/useTranslation'
import { supabase } from 'lib/supabase'
import { sanitizeHtml } from 'utils/security'
import PostMetaTable from './PostMetaTable'
import { LemonCollapse, LemonTag, LemonCard } from 'components/LemonUI'
import ForumAvatar from 'components/Forum/ForumAvatar'
import ArticleActions from 'components/Community/ArticleActions'




interface BodyProps {
    type: 'mdx' | 'plain'
    content: string
    featuredImage?: string
    featuredImageCaption?: string
    contributors?: Contributor[]
    date?: string
    tags?: { label: string; url?: string }[]
    wordCount?: number
    readTime?: number
    views?: number
}

interface Contributor {
    name: string
    image?: string
    color?: string
    username?: string
}

interface TreeMenuItem {
    name: string
    url?: string
    children?: TreeMenuItem[]
}

interface ReaderViewProps {
    body?: BodyProps
    title?: string
    hideTitle?: boolean
    tableOfContents?: TableOfContentsItem[]
    children?: React.ReactNode
    leftSidebar?: React.ReactNode
    hideLeftSidebar?: boolean
    hideRightSidebar?: boolean
    contentMaxWidthClass?: string
    padding?: boolean
    homeURL?: string
    description?: string
    rightActionButtons?: React.ReactNode
    showAbout?: boolean
    showQuestions?: boolean
    parent?: TreeMenuItem // For TreeMenu
    proseSize?: 'sm' | 'base' | 'lg'
    proseStyle?: 'default' | 'academic'
    onSearch?: (query: string) => void
    availableLanguages?: string[]
    useExternalProvider?: boolean
    initialLanguage?: string
    commentThreadSlug?: string
    bookmarkMeta?: {
        postId?: string
        slug: string
        title: string
    }
    className?: string
}



const ReaderViewContent = React.memo(({
    body = { type: 'plain', content: '' },
    title,
    hideTitle = false,
    tableOfContents,
    children,
    leftSidebar,
    hideLeftSidebar = false,
    hideRightSidebar = false,
    contentMaxWidthClass = 'max-w-2xl',
    rightActionButtons,
    showAbout = false,
    showQuestions = false,
    parent,
    proseSize = 'sm',
    proseStyle = 'default',
    onSearch,
    availableLanguages,
    commentThreadSlug,
    bookmarkMeta,
    className = '',
}: ReaderViewProps) => {
    const {
        isNavVisible,
        isTocVisible,
        fullWidthContent,
        backgroundImage,
        toggleNav,
        toggleToc,
        currentLanguage,
        setCurrentLanguage,
    } = useReaderView()

    const { posts, loading: postsLoading } = usePosts()
    const { user } = useAuth()
    const { addToast } = useToast()
    const { t } = useTranslation()
    const [isBookmarked, setIsBookmarked] = useState(false)
    const [bookmarkLoading, setBookmarkLoading] = useState(false)
    const suggestedPosts = React.useMemo(() => {
        return posts.slice(0, 10).map(p => ({
            name: p.title.toLowerCase(),
            url: p.slug.startsWith('/') ? p.slug : `/blog/${p.slug}`
        }))
    }, [posts])

    const contentRef = useRef<HTMLDivElement>(null)
    const scrollAreaRef = useRef<HTMLDivElement>(null)


    const showSidebar = tableOfContents && tableOfContents.length > 0 && !hideRightSidebar
    const renderLeftSidebar = !hideLeftSidebar
    const normalizedBookmarkSlug = (bookmarkMeta?.slug || '')
        .replace(/^\/(posts|blog)\//, '')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')

    // Scroll-preserving sidebar toggles: save position before state change,
    // then restore it after React re-renders and Radix recalculates viewport
    const scrollPreservingToggle = useCallback((toggleFn: () => void) => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null
        const savedScrollTop = viewport?.scrollTop ?? 0
        toggleFn()
        // Restore after React commit + Radix recalc
        requestAnimationFrame(() => {
            if (viewport) {
                viewport.scrollTop = savedScrollTop
            }
            // Double-raf for browsers that need an extra frame
            requestAnimationFrame(() => {
                if (viewport) {
                    viewport.scrollTop = savedScrollTop
                }
            })
        })
    }, [])

    const handleToggleNav = useCallback(() => {
        scrollPreservingToggle(toggleNav)
    }, [scrollPreservingToggle, toggleNav])

    const handleToggleToc = useCallback(() => {
        scrollPreservingToggle(toggleToc)
    }, [scrollPreservingToggle, toggleToc])

    const handleComment = () => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
        const commentsSection = document.getElementById('comments')
        if (viewport && commentsSection) {
            viewport.scrollTo({
                top: commentsSection.offsetTop - 20,
                behavior: 'smooth'
            })
        }
    }

    const scrollToHashTarget = (hash: string) => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null
        const targetId = hash.replace(/^#/, '')
        const heading = targetId ? document.getElementById(targetId) : null

        if (!viewport || !heading) return

        const offsetTop = heading.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop - 20
        viewport.scrollTo({
            top: offsetTop,
            behavior: 'smooth',
        })
    }

    const handleContentClick = (event: React.MouseEvent<HTMLElement>) => {
        const target = event.target as HTMLElement | null
        const anchor = target?.closest('a') as HTMLAnchorElement | null

        if (!anchor) return

        const rawHref = (anchor.getAttribute('href') || '').trim()

        if (!rawHref || rawHref === '#') {
            event.preventDefault()
            return
        }

        if (rawHref.startsWith('#')) {
            event.preventDefault()
            scrollToHashTarget(rawHref)
            return
        }

        try {
            const targetUrl = new URL(anchor.href, window.location.href)
            const currentUrl = new URL(window.location.href)
            const isSamePage = targetUrl.origin === currentUrl.origin && targetUrl.pathname === currentUrl.pathname

            if (isSamePage && !targetUrl.hash && !targetUrl.search) {
                event.preventDefault()
                return
            }

            if (isSamePage && (targetUrl.hash || rawHref.endsWith('#'))) {
                event.preventDefault()
                if (targetUrl.hash) {
                    scrollToHashTarget(targetUrl.hash)
                }
            }
        } catch {
            return
        }
    }

    useEffect(() => {
        const checkBookmarkStatus = async () => {
            if (!user?.id || !normalizedBookmarkSlug) {
                setIsBookmarked(false)
                return
            }

            const { data, error } = await supabase
                .from('user_saved_posts')
                .select('id')
                .eq('user_id', user.id)
                .eq('post_slug', normalizedBookmarkSlug)
                .maybeSingle()

            if (error) {
                setIsBookmarked(false)
                return
            }

            setIsBookmarked(!!data)
        }

        checkBookmarkStatus()
    }, [normalizedBookmarkSlug, user?.id])

    const handleBookmark = async () => {
        if (!normalizedBookmarkSlug) return

        if (!user?.id) {
            addToast(t('reader.login_to_save'), 'warning')
            return
        }

        setBookmarkLoading(true)

        if (isBookmarked) {
            const { error } = await supabase
                .from('user_saved_posts')
                .delete()
                .eq('user_id', user.id)
                .eq('post_slug', normalizedBookmarkSlug)

            if (error) {
                addToast(error.message || t('reader.unsave_failed'), 'error')
                setBookmarkLoading(false)
                return
            }

            setIsBookmarked(false)
            addToast(t('reader.unsave_success'), 'info')
            setBookmarkLoading(false)
            return
        }

        const { error } = await supabase
            .from('user_saved_posts')
            .insert({
                user_id: user.id,
                post_id: bookmarkMeta?.postId || null,
                post_slug: normalizedBookmarkSlug,
                post_title: bookmarkMeta?.title || '',
            })

        if (error) {
            addToast(error.message || t('reader.save_failed'), 'error')
            setBookmarkLoading(false)
            return
        }

        setIsBookmarked(true)
        addToast(t('reader.save_success'), 'success')
        setBookmarkLoading(false)
    }

    return (
        <div data-scheme="primary" className={`w-full h-full flex flex-col bg-white dark:bg-[#151515] text-primary overflow-hidden ${className}`}>
            <div data-scheme="secondary" className="bg-transparent flex w-full flex-grow min-h-0 relative">
                {/* LEFT SIDEBAR CONTENT DEFINITION */}
                {(() => {
                    const leftSidebarContent = (
                        <ScrollArea className="h-full">
                            {leftSidebar || (parent && parent.children && <TreeMenu items={parent.children} />) || (
                                <div className="p-3 space-y-4">
                                    {/* Suggested Posts Section */}
                                    <div>
                                        <div className="flex items-center gap-2 px-2 mb-3 pt-2">
                                            <div className="w-1 h-3 rounded-full bg-gradient-to-b from-[var(--primary-3000)] to-[var(--primary-3000)]/40" />
                                            <h4 className="font-nav font-black text-black dark:text-white m-0 text-[10px] lowercase tracking-[0.2em]">
                                                {t('reader.suggested')}
                                            </h4>
                                        </div>
                                        {postsLoading && posts.length === 0 ? (
                                            <div className="space-y-2 px-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className="flex items-center gap-2 animate-pulse">
                                                        <div className="w-[3px] h-3 rounded-full bg-primary-text/5" />
                                                        <div className="h-3 rounded-[12px] bg-primary-text/5 flex-1" style={{ width: `${60 + Math.random() * 30}%` }} />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <TreeMenu items={suggestedPosts} />
                                        )}
                                    </div>
                                </div>
                            )}
                        </ScrollArea>
                    )

                    return (
                        <AnimatePresence>
                            {renderLeftSidebar && isNavVisible && (
                                <>
                                    {/* Mobile Left Sidebar (Floating Panel) */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-black/20 z-40 lg:hidden"
                                        onClick={handleToggleNav}
                                    />
                                    <motion.div
                                        initial={{ x: "-100%", opacity: 0 }}
                                        animate={{ x: "0%", opacity: 1 }}
                                        exit={{ x: "-100%", opacity: 0 }}
                                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                        className="absolute top-1 bottom-1 left-1 w-1/2 bg-[var(--color-bg-surface-primary)] z-50 rounded-sm shadow-2xl overflow-hidden border border-[var(--border-3000)] lg:hidden"
                                    >
                                        {leftSidebarContent}
                                    </motion.div>

                                    {/* Desktop Left Sidebar (Side Panel) */}
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 220, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="border-r border-[var(--border-3000)] bg-[var(--color-bg-surface-primary)]/10 overflow-hidden flex-shrink-0 hidden lg:block"
                                    >
                                        {leftSidebarContent}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    )
                })()}

                <div ref={scrollAreaRef} className="flex-grow flex flex-col min-h-0 relative bg-transparent">
                    <ScrollArea
                        data-scheme="primary"
                        className="flex-grow relative bg-transparent"
                        style={backgroundImage && backgroundImage !== 'none' ? {
                            backgroundImage: `url(${backgroundImage === 'james' ? 'https://res.cloudinary.com/dmukukwp6/image/upload/v1738943658/James_H_5cb4c53d9a.png' : 'https://res.cloudinary.com/dmukukwp6/image/upload/Frame_10127_b7362fd913.png'})`,
                            backgroundRepeat: backgroundImage === 'james' ? 'repeat' : 'no-repeat',
                            backgroundSize: backgroundImage === 'james' ? '10%' : 'cover',
                            backgroundPosition: backgroundImage === 'james' ? 'center' : 'bottom right',
                        } : undefined}
                    >
                        <div className={`mx-auto p-4 md:p-8 transition-all ${fullWidthContent ? 'max-w-full' : contentMaxWidthClass}`}>
                            {/* Post Title */}
                            {title && !hideTitle && (
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary leading-snug mb-6 mt-1">
                                    {title}
                                </h1>
                            )}

                            {/* LemonUI Metadata & Action Card */}
                            <LemonCard hoverEffect={false} className="mb-6 p-4 md:p-5 flex flex-col gap-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        {body.contributors && body.contributors[0] && (
                                            <div className="flex items-center gap-2">
                                                <ForumAvatar
                                                    className="size-8 rounded-full border border-black/10 dark:border-white/10"
                                                    image={body.contributors[0].image}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-primary leading-none">
                                                        {body.contributors[0].name}
                                                    </span>
                                                    {body.contributors[0].username && (
                                                        <span className="text-[11px] text-secondary/70 mt-0.5">
                                                            @{body.contributors[0].username}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {body.date && (
                                            <span className="text-xs text-secondary/60">
                                                · {new Date(body.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                        {body.readTime && (
                                            <span className="text-xs text-secondary/60">
                                                · {body.readTime} min read
                                            </span>
                                        )}
                                    </div>

                                    {/* PostHog LemonTag Badges */}
                                    {body.tags && body.tags.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {body.tags.map((tag, i) => (
                                                <LemonTag key={i} type="option" className="!text-[10px] uppercase tracking-wider font-semibold">
                                                    {tag.label}
                                                </LemonTag>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Article Actions Toolbar */}
                                <div className="-mb-2">
                                    <ArticleActions slug={commentThreadSlug || bookmarkMeta?.slug} views={body.views} />
                                </div>
                            </LemonCard>

                            {/* Featured Image */}
                            {body.featuredImage && (
                                <div className="mb-8 rounded-[16px] md:rounded-[20px] overflow-hidden border border-black/10 dark:border-white/10 shadow-sm aspect-video relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={body.featuredImage}
                                        alt={title || ''}
                                        className="w-full h-full object-cover"
                                    />
                                    {body.featuredImageCaption && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 text-xs text-center italic text-white/90">
                                            {body.featuredImageCaption}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="reader-content-container overflow-x-hidden" onClick={handleContentClick}>
                                <div
                                    className={`@container [&>*:not(.OSTable):not(.Table)]:mx-auto [&>*:not(.OSTable):not(.Table)]:transition-all [&>span:not(.OSTable):not(.Table)]:block ${proseSize === 'lg'
                                        ? '[&>*:not(.OSTable):not(.Table)]:max-w-full'
                                        : '[&>*:not(.OSTable):not(.Table)]:max-w-2xl'
                                        }`}
                                >
                                    <article
                                        ref={contentRef}
                                        className={`reader-view-content-container @container/reader-content-container ${getProseClasses(
                                            proseSize
                                        )} max-w-none relative`}
                                    >
                                        {body.type === 'mdx' ? (
                                            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(body.content) }} />
                                        ) : (
                                            children
                                        )}
                                    </article>
                                </div>
                            </div>

                            {showQuestions && (
                                <div id="comments" className="mt-12">
                                    <CommentSection slug={commentThreadSlug || title} views={body.views} />
                                </div>
                            )}

                            {showAbout && (
                                <div className="mt-16 p-6 bg-accent/10 rounded-[24px] border border-primary/20 italic text-lg leading-relaxed">
                                    PostHog is an all-in-one developer platform for building successful products. We provide product analytics, web analytics, session replay, and more to help you debug your code and ship features faster.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* RIGHT SIDEBAR CONTENT DEFINITION */}
                {(() => {
                    const rightSidebarContent = (
                        <ScrollArea className="h-full pt-3 pb-2">
                            <TableOfContents title={t('reader.content_toc')} tableOfContents={tableOfContents || []} contentRef={contentRef} />
                        </ScrollArea>
                    )

                    return (
                        <AnimatePresence>
                            {showSidebar && isTocVisible && (
                                <>
                                    {/* Mobile Right Sidebar (Floating Panel) */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-black/20 z-40 lg:hidden"
                                        onClick={handleToggleToc}
                                    />
                                    <motion.div
                                        initial={{ x: "100%", opacity: 0 }}
                                        animate={{ x: "0%", opacity: 1 }}
                                        exit={{ x: "100%", opacity: 0 }}
                                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                        className="absolute top-1 bottom-1 right-1 w-1/2 bg-[var(--color-bg-surface-primary)] z-50 rounded-sm shadow-2xl overflow-hidden border border-[var(--border-3000)] lg:hidden"
                                    >
                                        {rightSidebarContent}
                                    </motion.div>

                                    {/* Desktop Right Sidebar (Side Panel) */}
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 220, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="border-l border-[var(--border-3000)] bg-[var(--color-bg-surface-primary)]/10 overflow-hidden flex-shrink-0 hidden lg:block"
                                    >
                                        {rightSidebarContent}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    )
                })()}
            </div>
            <FooterBar
                isNavVisible={isNavVisible}
                isTocVisible={isTocVisible}
                onToggleNav={handleToggleNav}
                onToggleToc={handleToggleToc}
                showBack={true}
                showForward={true}
                showSearch
                showToc={showSidebar}
                hasLeftSidebar={renderLeftSidebar}
                title={title}
                searchContentRef={contentRef}
                onComment={handleComment}
                onBookmark={bookmarkMeta?.slug ? handleBookmark : undefined}
                isBookmarked={isBookmarked}
                bookmarkLoading={bookmarkLoading}
                onSearch={onSearch}
                currentLanguage={currentLanguage}
                availableLanguages={availableLanguages}
                onLanguageChange={setCurrentLanguage}
                rightActionButtons={
                    <div className="flex items-center gap-2">
                        {rightActionButtons}
                    </div>
                }
            />
        </div>
    )
})

ReaderViewContent.displayName = 'ReaderViewContent'

export default function ReaderView(props: ReaderViewProps) {
    if (props.useExternalProvider) {
        return (
            <InPageSearchProvider>
                <ReaderViewContent {...props} />
            </InPageSearchProvider>
        )
    }

    return (
        <ReaderViewProvider initialLanguage={props.initialLanguage}>
            <InPageSearchProvider>
                <ReaderViewContent {...props} />
            </InPageSearchProvider>
        </ReaderViewProvider>
    )
}
