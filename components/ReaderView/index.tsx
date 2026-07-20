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
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

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
                                            <div className="w-1 h-3 rounded-full bg-gradient-to-b from-burnt-orange to-burnt-orange/40" />
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
                                        className="absolute top-1 bottom-1 left-1 w-1/2 bg-primary z-50 rounded-sm shadow-2xl overflow-hidden border border-black/10 lg:hidden"
                                    >
                                        {leftSidebarContent}
                                    </motion.div>

                                    {/* Desktop Left Sidebar (Side Panel) */}
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 220, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="border-r border-primary bg-transparent overflow-hidden flex-shrink-0 hidden lg:block"
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
                            {body.featuredImage && (
                                <div className="mb-8 rounded-[24px] md:rounded-[32px] overflow-hidden border border-black/5 dark:border-white/5 shadow-lg aspect-video relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={body.featuredImage}
                                        alt={title || ''}
                                        className="w-full h-full object-cover"
                                    />
                                    {body.featuredImageCaption && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-sm text-center italic text-white/80">
                                            {body.featuredImageCaption}
                                        </div>
                                    )}
                                </div>
                            )}

                            {title && !hideTitle && (
                                <h1
                                    className={`mx-auto transition-all tracking-tight font-black ${proseSize === 'lg' ? 'max-w-full text-4xl' : 'max-w-3xl text-3xl md:text-4xl'
                                        } leading-tight mb-2 mt-4`}
                                >
                                    {title}
                                </h1>
                            )}

                            {(body.date || body.contributors || (body.tags && body.tags.length > 0)) && (
                                <div className="LemonTable my-4" data-attr="notebooks-table">
                                    <div role="presentation" className="ScrollableShadows" style={{ position: 'relative' }}>
                                        <div
                                            role="presentation"
                                            className="ScrollableShadows__inner"
                                            style={{ overflowX: 'auto', overflowY: 'hidden' }}
                                        >
                                            <div role="presentation" className="min-w-0" style={{ minWidth: 'fit-content' }}>
                                                <div className="LemonTable__content">
                                                    <table>
                                                        <colgroup>
                                                            <col style={{ width: '40%' }} />
                                                            <col style={{ width: '30%' }} />
                                                            <col style={{ width: '30%' }} />
                                                        </colgroup>
                                                        <thead>
                                                            <tr>
                                                                <th className="LemonTable__header">
                                                                    <div className="LemonTable__header-content"><div>Created by</div></div>
                                                                </th>
                                                                <th className="LemonTable__header">
                                                                    <div className="LemonTable__header-content"><div>Created</div></div>
                                                                </th>
                                                                <th className="LemonTable__header">
                                                                    <div className="LemonTable__header-content"><div>Read time</div></div>
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                {/* Created by — sleek AI agent badges */}
                                                                <td>
                                                                    {body.contributors && body.contributors.length > 0 ? (
                                                                        <div className="flex items-center gap-1.5 py-0.5" title={body.contributors.map(c => `@${c.name}`).join(', ')}>
                                                                            <div className="flex -space-x-1 items-center">
                                                                                {body.contributors.slice(0, 4).map((c, idx) => {
                                                                                    const colors = [
                                                                                        'bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30',
                                                                                        'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30',
                                                                                        'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30',
                                                                                        'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
                                                                                    ]
                                                                                    const colorStyle = colors[idx % colors.length]
                                                                                    return (
                                                                                        <span
                                                                                            key={c.name}
                                                                                            className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono border ${colorStyle} shrink-0`}
                                                                                            title={`@${c.name}`}
                                                                                        >
                                                                                            {c.name.charAt(0).toUpperCase()}
                                                                                        </span>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                            <span className="profile-name text-xs font-mono">
                                                                                @{body.contributors[0].username || body.contributors[0].name}
                                                                                {body.contributors.length > 1 && (
                                                                                    <span className="opacity-50"> +{body.contributors.length - 1}</span>
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="opacity-40">—</span>
                                                                    )}
                                                                </td>
                                                                {/* Created date */}
                                                                <td>
                                                                    <span className="whitespace-nowrap text-xs">
                                                                        {body.date ? dayjs.utc(body.date).format('MMM D, YYYY') : '—'}
                                                                    </span>
                                                                </td>
                                                                {/* Read time */}
                                                                <td>
                                                                    {body.readTime !== undefined ? (
                                                                        <span className="LemonTag">{body.readTime} min read</span>
                                                                    ) : (
                                                                        <span className="opacity-40">—</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Tags footer row — only if tags exist */}
                                    {body.tags && body.tags.length > 0 && (
                                        <div className="LemonTable__footer px-3 py-1.5 flex flex-wrap gap-1.5">
                                            {body.tags.map((tag) => (
                                                tag.url && tag.url !== '#' ? (
                                                    <a key={`${tag.label}-${tag.url}`} href={tag.url} className="LemonTag hover:opacity-75 transition-opacity">
                                                        {tag.label.toLowerCase()}
                                                    </a>
                                                ) : (
                                                    <span key={tag.label} className="LemonTag">
                                                        {tag.label.toLowerCase()}
                                                    </span>
                                                )
                                            ))}
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
                                {showQuestions && (
                                    <div id="comments" className="mt-12">
                                        <CommentSection slug={commentThreadSlug || title} views={body.views} />
                                    </div>
                                )}
                            </div>

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
                                        className="absolute top-1 bottom-1 right-1 w-1/2 bg-primary z-50 rounded-sm shadow-2xl overflow-hidden border border-black/10 lg:hidden"
                                    >
                                        {rightSidebarContent}
                                    </motion.div>

                                    {/* Desktop Right Sidebar (Side Panel) */}
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 220, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="border-l border-primary bg-transparent overflow-hidden flex-shrink-0 hidden lg:block"
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
