"use client"

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import OSButton from 'components/OSButton'
import { IconChevronDown } from '@posthog/icons'
import ScrollArea from 'components/RadixUI/ScrollArea'
import FooterBar from '../OSChrome/FooterBar'
import { TreeMenu } from '../TreeMenu'
import CloudinaryImage from 'components/CloudinaryImage'
import { ReaderViewProvider, useReaderView } from './context/ReaderViewContext'
import { ContributorsSmall } from './ContributorsSmall'
import { TableOfContents, type TableOfContentsItem } from './TableOfContents'
import CommentSection from '../Community/CommentSection'
import { getProseClasses } from '../../constants/index'
import { InPageSearchProvider } from 'components/Search/InPageSearchContext'
import { usePosts } from 'hooks/usePosts'
import { useAuth } from 'context/AuthContext'
import { useToast } from 'context/ToastContext'
import { supabase } from 'lib/supabase'

interface BodyProps {
    type: 'mdx' | 'plain'
    content: string
    featuredImage?: string
    featuredImageCaption?: string
    contributors?: Contributor[]
    date?: string
    tags?: { label: string; url?: string }[]
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
    padding = true,
    homeURL,
    description,
    rightActionButtons,
    showAbout = false,
    showQuestions = false,
    parent,
    proseSize = 'sm',
    onSearch,
    availableLanguages,
    commentThreadSlug,
    bookmarkMeta,
}: ReaderViewProps) => {
    const {
        isNavVisible,
        isTocVisible,
        fullWidthContent,
        backgroundImage,
        toggleNav,
        toggleToc,
        setFullWidthContent,
        currentLanguage,
        setCurrentLanguage,
    } = useReaderView()

    const { posts, loading: postsLoading } = usePosts()
    const { user } = useAuth()
    const { addToast } = useToast()
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
            addToast('please log in to save posts', 'warning')
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
                addToast(error.message || 'failed to remove bookmark', 'error')
                setBookmarkLoading(false)
                return
            }

            setIsBookmarked(false)
            addToast('removed from saved posts', 'info')
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
            addToast(error.message || 'failed to save post', 'error')
            setBookmarkLoading(false)
            return
        }

        setIsBookmarked(true)
        addToast('post saved to your profile', 'success')
        setBookmarkLoading(false)
    }

    return (
        <div data-scheme="primary" className="w-full h-full flex flex-col bg-primary text-primary overflow-hidden">
            <div data-scheme="secondary" className="bg-primary flex w-full flex-grow min-h-0 relative">
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
                                            <h4 className="font-black text-primary/50 m-0 text-[10px] lowercase tracking-[0.2em]">
                                                suggested posts
                                            </h4>
                                        </div>
                                        {postsLoading && posts.length === 0 ? (
                                            <div className="space-y-2 px-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className="flex items-center gap-2 animate-pulse">
                                                        <div className="w-[3px] h-3 rounded-full bg-primary-text/5" />
                                                        <div className="h-3 rounded bg-primary-text/5 flex-1" style={{ width: `${60 + Math.random() * 30}%` }} />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <TreeMenu items={suggestedPosts} />
                                        )}
                                    </div>

                                    {/* Decorative separator */}
                                    <div className="px-4 py-1">
                                        <div className="h-[1px] bg-gradient-to-r from-transparent via-primary/8 to-transparent" />
                                    </div>

                                    {/* Mini branding footer */}
                                    <div className="px-3 pb-2">
                                        <p className="text-[9px] font-bold text-primary/15 uppercase tracking-[0.15em] m-0">
                                            worldinmaking.com
                                        </p>
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
                                        onClick={toggleNav}
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
                                        className="border-r border-primary bg-primary overflow-hidden flex-shrink-0 hidden lg:block"
                                    >
                                        {leftSidebarContent}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    )
                })()}

                <div ref={scrollAreaRef} className="flex-grow flex flex-col min-h-0 relative bg-primary">
                    <ScrollArea
                        data-scheme="primary"
                        className="flex-grow relative bg-primary"
                        style={backgroundImage && backgroundImage !== 'none' ? {
                            backgroundImage: `url(${backgroundImage === 'james' ? 'https://res.cloudinary.com/dmukukwp6/image/upload/v1738943658/James_H_5cb4c53d9a.png' : 'https://res.cloudinary.com/dmukukwp6/image/upload/Frame_10127_b7362fd913.png'})`,
                            backgroundRepeat: backgroundImage === 'james' ? 'repeat' : 'no-repeat',
                            backgroundSize: backgroundImage === 'james' ? '10%' : 'cover',
                            backgroundPosition: backgroundImage === 'james' ? 'center' : 'bottom right',
                        } : undefined}
                    >
                        <div className={`mx-auto p-4 md:p-8 transition-all ${fullWidthContent ? 'max-w-full' : contentMaxWidthClass}`}>
                            {body.featuredImage && (
                                <div className="mb-8 rounded-lg overflow-hidden border border-primary shadow-lg aspect-video relative">
                                    <CloudinaryImage
                                        src={body.featuredImage}
                                        alt={title || ''}
                                        fill
                                        priority
                                        imgClassName="object-contain" // Keep aspect ratio but fit
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
                                    className={`mx-auto transition-all normal-case tracking-tight ${proseSize === 'lg' ? 'max-w-full' : 'max-w-2xl'
                                        }`}
                                >
                                    {title}
                                </h1>
                            )}

                            {(body.date || body.contributors || body.tags) && (
                                <div className="mt-6 mx-auto max-w-3xl w-full border border-border rounded bg-accent">
                                    <div className="flex items-center divide-x divide-border">
                                        {body.contributors && (
                                            <div className="px-4 py-2 flex items-center">
                                                <ContributorsSmall contributors={body.contributors} />
                                            </div>
                                        )}
                                        {body.date && (
                                            <div className="px-4 py-2 flex items-center">
                                                <span className="text-[11px] font-bold text-primary/50">{body.date}</span>
                                            </div>
                                        )}
                                        {body.tags && body.tags.length > 0 && (
                                            <div className="px-4 py-2 flex items-center gap-2 ml-auto">
                                                {body.tags?.map((tag) => (
                                                    tag.url && tag.url !== '#' ? (
                                                        <a
                                                            key={`${tag.label}-${tag.url}`}
                                                            href={tag.url}
                                                            className="text-[10px] font-bold text-primary hover:text-burnt-orange transition-colors"
                                                        >
                                                            {tag.label}
                                                        </a>
                                                    ) : (
                                                        <span
                                                            key={tag.label}
                                                            className="text-[10px] font-bold text-primary"
                                                        >
                                                            {tag.label}
                                                        </span>
                                                    )
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="reader-content-container" onClick={handleContentClick}>
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
                                        )} max-w-none relative text-primary`}
                                        style={{ fontSize: '15px' }}
                                    >
                                        {body.type === 'mdx' ? (
                                            <div dangerouslySetInnerHTML={{ __html: body.content }} />
                                        ) : (
                                            children
                                        )}
                                    </article>
                                </div>
                                {showQuestions && (
                                    <div id="comments" className="mt-12">
                                        <CommentSection slug={commentThreadSlug || title} />
                                    </div>
                                )}
                            </div>

                            {showAbout && (
                                <div className="mt-16 p-6 bg-accent/10 rounded-lg border border-primary/20 italic text-lg leading-relaxed">
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
                            <TableOfContents title="Content" tableOfContents={tableOfContents || []} contentRef={contentRef} />
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
                                        onClick={toggleToc}
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
                                        className="border-l border-primary bg-primary overflow-hidden flex-shrink-0 hidden lg:block"
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
                onToggleNav={toggleNav}
                onToggleToc={toggleToc}
                showBack={true}
                showForward={true}
                showSearch
                showToc={showSidebar}
                hasLeftSidebar={renderLeftSidebar}
                homeURL={homeURL}
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
