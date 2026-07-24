"use client"

import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LemonButton } from 'components/LemonUI'
import {
    IconSidebarOpen,
    IconSidebarClose,
    IconChevronLeft,
    IconChevronRight,
    IconSearch,
    IconTableOfContents,
    IconBookmark,
    IconBookmarkSolid,
    IconGlobe,
    IconMessage,
} from '@posthog/icons'
import Tooltip from 'components/RadixUI/Tooltip'
import { useApp } from 'context/App'
import { useWindow } from 'context/Window'
import InPageSearchBar from 'components/Search/InPageSearchBar'
import { LanguageSelector } from './LanguageSelector'
import KeyboardShortcut from 'components/KeyboardShortcut'

interface FooterBarProps {
    isNavVisible?: boolean
    isTocVisible?: boolean
    onToggleNav?: () => void
    onToggleToc?: () => void
    showBack?: boolean
    showForward?: boolean
    showSearch?: boolean
    showToc?: boolean
    hasLeftSidebar?: boolean
    rightActionButtons?: React.ReactNode
    title?: string
    navIconClassName?: string
    searchContentRef?: React.RefObject<HTMLElement | null>
    onBookmark?: () => void
    isBookmarked?: boolean
    bookmarkLoading?: boolean
    onComment?: () => void
    onSearch?: (query: string) => void
    currentLanguage?: string
    availableLanguages?: string[]
    onLanguageChange?: (code: string) => void
}

export default function FooterBar({
    isNavVisible,
    isTocVisible,
    onToggleNav,
    onToggleToc,
    showBack = false,
    showForward = false,
    showSearch = false,
    showToc = false,
    hasLeftSidebar = false,
    rightActionButtons,
    title,
    navIconClassName = '',
    searchContentRef,
    onBookmark,
    isBookmarked = false,
    bookmarkLoading = false,
    onComment,
    onSearch,
    currentLanguage = 'en',
    availableLanguages,
    onLanguageChange,
}: FooterBarProps) {
    const appContext = useApp()
    const compact = appContext?.compact
    const focusedWindow = appContext?.focusedWindow

    const windowContext = useWindow()
    const goBack = windowContext?.goBack
    const goForward = windowContext?.goForward
    const canGoBack = windowContext?.canGoBack
    const canGoForward = windowContext?.canGoForward
    const appWindow = windowContext?.appWindow

    const [searchOpen, setSearchOpen] = React.useState(false)
    const [languageOpen, setLanguageOpen] = React.useState(false)

    const toggleSearch = () => setSearchOpen(!searchOpen)
    const toggleLanguage = () => setLanguageOpen(!languageOpen)

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.shadowRoot
            ) {
                return
            }
            // Only handle Shift+F if this window is the focused/active window
            if (e.key === 'F' && e.shiftKey && focusedWindow?.key === appWindow?.key) {
                e.preventDefault()
                setSearchOpen(true)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [focusedWindow, appWindow])

    // Compact, minimal button styling
    const mainIconBtnClass = "p-1 h-6 w-6 !rounded-md opacity-70 hover:opacity-100 transition-opacity"
    const interactionBtnClass = "p-1 h-6 w-6 !rounded-md opacity-70 hover:opacity-100 transition-opacity"

    const [footerTarget, setFooterTarget] = React.useState<HTMLElement | null>(null)

    React.useEffect(() => {
        if (appWindow?.key) {
            const el = document.getElementById(`window-footer-${appWindow.key}`)
            if (el) {
                setFooterTarget(el)
            }
        }
    }, [appWindow?.key])

    const [isBarExpanded, setIsBarExpanded] = React.useState(false)

    const content = (
        <div data-scheme="tertiary" className="flex w-full items-center px-1 py-1 select-none gap-1.5 justify-start bg-transparent border-0">
            {/* Framed Single Sidebar Icon Button (Main Trigger - Prominent White Border & Frosted BG) */}
            <Tooltip
                trigger={
                    <LemonButton
                        size="small"
                        onClick={(e) => {
                            e.preventDefault()
                            setIsBarExpanded(!isBarExpanded)
                        }}
                        active={isBarExpanded}
                        className="p-1.5 h-7.5 w-7.5 !rounded-xl border-2 border-white dark:border-white/20 bg-white/95 dark:bg-[#121214]/95 shadow-md backdrop-blur-md opacity-100 hover:scale-105 transition-all flex items-center justify-center shrink-0"
                    >
                        {isBarExpanded ? (
                            <IconSidebarClose className="size-4 text-primary" />
                        ) : (
                            <IconSidebarOpen className="size-4 text-primary" />
                        )}
                    </LemonButton>
                }
                side="bottom"
            >
                {isBarExpanded ? 'collapse options' : 'expand options'}
            </Tooltip>

            {/* Horizontally Expanding Options Bar (Thin Frosted Background with White Border) */}
            <AnimatePresence initial={false}>
                {isBarExpanded && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="flex items-center gap-1.5 overflow-hidden flex-1 justify-between px-2.5 py-1 rounded-xl border border-white dark:border-white/20 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-md shadow-md"
                    >
                        {/* LEFT SECTION: Sidebar, Nav, Separator, Bookmark, Comment */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                            <div className="flex items-center">
                                {hasLeftSidebar && (
                                    <Tooltip
                                        trigger={
                                            <LemonButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    onToggleNav?.()
                                                }}
                                                active={isNavVisible}
                                                className={mainIconBtnClass}
                                            >
                                                {isNavVisible ? (
                                                    <IconSidebarOpen className={`${navIconClassName} size-3.5`} />
                                                ) : (
                                                    <IconSidebarClose className={`${navIconClassName} size-3.5`} />
                                                )}
                                            </LemonButton>
                                        }
                                    >
                                        {isNavVisible ? 'hide' : 'show'} sidebar
                                    </Tooltip>
                                )}
                            </div>

                            {/* Back/Forward buttons */}
                            {(showBack || showForward) && (
                                <div className="hidden sm:flex items-center gap-0.5 ml-0.5 pl-0.5 border-l border-black/10 dark:border-white/10 h-3">
                                    {showBack && (
                                        <LemonButton
                                            size="small"
                                            onClick={goBack}
                                            disabled={!canGoBack}
                                            className="p-0.5 h-6 w-6 !rounded-md"
                                        >
                                            <IconChevronLeft className={`size-3.5 ${canGoBack ? 'opacity-100' : 'opacity-30'}`} />
                                        </LemonButton>
                                    )}
                                    {showForward && (
                                        <LemonButton
                                            size="small"
                                            onClick={goForward}
                                            disabled={!canGoForward}
                                            className="p-0.5 h-6 w-6 !rounded-md"
                                        >
                                            <IconChevronRight className={`size-3.5 ${canGoForward ? 'opacity-100' : 'opacity-30'}`} />
                                        </LemonButton>
                                    )}
                                </div>
                            )}

                            {/* Separator */}
                            <div className="w-px h-3 bg-black/10 dark:bg-white/10 mx-0.5 flex-shrink-0" />

                            {/* Bookmark & Comment */}
                            <div className="flex items-center gap-0.5">
                                <Tooltip trigger={
                                    <LemonButton
                                        size="small"
                                        className={interactionBtnClass}
                                        onClick={onBookmark}
                                        disabled={!onBookmark || bookmarkLoading}
                                        active={isBookmarked}
                                    >
                                        {isBookmarked ? (
                                            <IconBookmarkSolid className="size-3.5 text-primary" />
                                        ) : (
                                            <IconBookmark className={`size-3.5 ${onBookmark ? 'text-primary' : 'text-primary/30'}`} />
                                        )}
                                    </LemonButton>
                                } side="bottom">bookmark</Tooltip>

                                <Tooltip trigger={
                                    <LemonButton size="small" className={interactionBtnClass} onClick={onComment} disabled={!onComment}>
                                        <IconMessage className={`size-3.5 ${onComment ? 'text-primary' : 'text-primary/30'}`} />
                                    </LemonButton>
                                } side="bottom">comment</Tooltip>
                            </div>
                        </div>

                        {/* RIGHT SECTION: Alignments, Separator, Search, TOC */}
                        <div className="flex items-center gap-0.5 justify-end flex-shrink-0">
                            {rightActionButtons}
                            <div className="relative">
                                <Tooltip trigger={
                                    <LemonButton
                                        size="small"
                                        className={interactionBtnClass}
                                        onClick={toggleLanguage}
                                        active={languageOpen}
                                    >
                                        <IconGlobe className="size-3.5 text-primary" />
                                    </LemonButton>
                                } side="bottom">language</Tooltip>

                                <LanguageSelector
                                    visible={languageOpen}
                                    onClose={() => setLanguageOpen(false)}
                                    currentLanguage={currentLanguage}
                                    availableLanguages={availableLanguages}
                                    onLanguageChange={onLanguageChange || (() => { })}
                                />
                            </div>

                            {/* Separator */}
                            <div className="w-px h-3 bg-black/10 dark:bg-white/10 mx-0.5 flex-shrink-0" />

                            {/* Search & TOC */}
                            <div className="flex items-center gap-0.5 relative">
                                {showSearch && (
                                    <Tooltip
                                        trigger={
                                            <LemonButton size="small" className={mainIconBtnClass} onClick={toggleSearch} active={searchOpen}>
                                                <IconSearch className="size-3.5" />
                                            </LemonButton>
                                        }
                                        side="bottom"
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span>search this page</span>
                                            <div className="flex gap-1 items-center opacity-70">
                                                <KeyboardShortcut text="Shift" size="xs" />
                                                <KeyboardShortcut text="F" size="xs" />
                                            </div>
                                        </div>
                                    </Tooltip>
                                )}

                                {showSearch && (
                                    <InPageSearchBar
                                        visible={searchOpen}
                                        onClose={() => setSearchOpen(false)}
                                        contentRef={searchContentRef}
                                        onSearch={onSearch}
                                        className="-top-2 right-0 -translate-y-full"
                                    />
                                )}

                                {showToc && (
                                    <Tooltip
                                        trigger={
                                            <LemonButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    onToggleToc?.()
                                                }}
                                                active={isTocVisible}
                                                className={`${mainIconBtnClass} ${!compact ? '!w-auto !px-2' : ''}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <IconTableOfContents className="size-3.5" />
                                                    {!compact && (
                                                        <div className="hidden lg:flex flex-col items-start leading-none text-left min-w-[60px]">
                                                            <span className="text-[9px] font-bold opacity-60">contents</span>
                                                            <span className="text-[11px] font-bold truncate max-w-[80px]">{title}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </LemonButton>
                                        }
                                    >
                                        {isTocVisible ? 'hide' : 'show'} table of contents
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )

    if (footerTarget) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return createPortal(content, footerTarget) as any
    }

    return content
}
