"use client"

import React, { useEffect, useRef } from 'react'
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

interface BodyProps {
    type: 'mdx' | 'plain'
    content: string
    featuredImage?: string
    featuredImageCaption?: string
    contributors?: Contributor[]
    date?: string
    tags?: { label: string; url: string }[]
}

interface Contributor {
    name: string
    image?: string
    color?: string
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
}

export default function ReaderView(props: ReaderViewProps) {
    return (
        <ReaderViewProvider>
            <InPageSearchProvider>
                <ReaderViewContent {...props} />
            </InPageSearchProvider>
        </ReaderViewProvider>
    )
}

function ReaderViewContent({
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
}: ReaderViewProps) {
    const {
        isNavVisible,
        isTocVisible,
        fullWidthContent,
        backgroundImage,
        toggleNav,
        toggleToc,
        setFullWidthContent,
    } = useReaderView()

    const { posts, loading: postsLoading } = usePosts()
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

    return (
        <div data-scheme="primary" className="w-full h-full flex flex-col bg-primary text-primary overflow-hidden">
            <div data-scheme="secondary" className="bg-primary flex w-full flex-grow min-h-0 relative">
                {/* LEFT SIDEBAR CONTENT DEFINITION */}
                {(() => {
                    const leftSidebarContent = (
                        <ScrollArea className="h-full p-2">
                            {leftSidebar || (parent && parent.children && <TreeMenu items={parent.children} />) || (
                                <div className="p-4 space-y-6">
                                    <div>
                                        <h4 className="font-bold text-primary-text/30 m-0 mb-2 text-[10px] uppercase tracking-widest px-2">
                                            suggested posts
                                        </h4>
                                        {postsLoading && posts.length === 0 ? (
                                            <div className="px-2 py-1 text-[10px] font-bold text-primary-text/20 animate-pulse lowercase">fetching latest editions...</div>
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

                <div ref={scrollAreaRef} className="flex-grow flex flex-col min-h-0 relative bg-[#fcfcfc]">
                    <ScrollArea
                        data-scheme="primary"
                        className="flex-grow relative bg-[#fcfcfc]"
                        style={backgroundImage && backgroundImage !== 'none' ? {
                            backgroundImage: `url(${backgroundImage === 'james' ? 'https://res.cloudinary.com/dmukukwp6/image/upload/v1738943658/James_H_5cb4c53d9a.png' : 'https://res.cloudinary.com/dmukukwp6/image/upload/Frame_10127_b7362fd913.png'})`,
                            backgroundRepeat: backgroundImage === 'james' ? 'repeat' : 'no-repeat',
                            backgroundSize: backgroundImage === 'james' ? '10%' : 'cover',
                            backgroundPosition: backgroundImage === 'james' ? 'center' : 'bottom right',
                        } : undefined}
                    >
                        <div className={`mx-auto p-4 md:p-8 transition-all ${fullWidthContent ? 'max-w-full' : contentMaxWidthClass}`}>
                            {body.featuredImage && (
                                <div className="mb-8 rounded-lg overflow-hidden border border-primary shadow-lg">
                                    <img src={body.featuredImage} alt={title} className="w-full h-auto" />
                                    {body.featuredImageCaption && (
                                        <div className="p-2 text-sm text-center italic opacity-60">
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
                                                <span className="text-[11px] font-bold text-black/50">{body.date}</span>
                                            </div>
                                        )}
                                        {body.tags && body.tags.length > 0 && (
                                            <div className="px-4 py-2 flex items-center gap-2 ml-auto">
                                                {body.tags?.map((tag) => (
                                                    <a
                                                        key={tag.url}
                                                        href={tag.url}
                                                        className="text-[10px] font-bold text-black/30 hover:text-burnt-orange transition-colors"
                                                    >
                                                        {tag.label}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="reader-content-container">
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
                                        )} max-w-none relative text-black`}
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
                                        <CommentSection slug={title} />
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
                        <ScrollArea className="h-full p-2">
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
                onAlignLeft={() => setFullWidthContent(true)}
                onAlignCenter={() => setFullWidthContent(false)}
                onComment={handleComment}
                onSearch={onSearch}
                rightActionButtons={
                    <div className="flex items-center gap-2">
                        {rightActionButtons}
                    </div>
                }
            />
        </div>
    )
}
