"use client"

import React from 'react'
import OSButton from 'components/OSButton'
import {
    IconHome,
    IconSidebarOpen,
    IconSidebarClose,
    IconChevronLeft,
    IconChevronRight,
    IconSearch,
    IconTableOfContents,
    IconBookmark,
} from '@posthog/icons'
import Tooltip from 'components/RadixUI/Tooltip'
import { useApp } from 'context/App'
import { useWindow } from 'context/Window'
import { MessageSquare, AlignLeft, AlignCenter, AlignRight, Search } from 'lucide-react'
import { InPageSearchBar } from 'components/Search/InPageSearchBar'
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
    homeURL?: string
    title?: string
    navIconClassName?: string
    searchContentRef?: React.RefObject<HTMLElement | null>
    onBookmark?: () => void
    onComment?: () => void
    onAlignLeft?: () => void
    onAlignCenter?: () => void
    onAlignRight?: () => void
    onSearch?: (query: string) => void
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
    homeURL,
    title,
    navIconClassName = '',
    searchContentRef,
    onBookmark,
    onComment,
    onAlignLeft,
    onAlignCenter,
    onAlignRight,
    onSearch,
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

    const toggleSearch = () => setSearchOpen(!searchOpen)

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

    // Consistent button styling for ALL icons
    // Slightly increased from h-7 w-7 to h-8 w-8
    // p-2 and p-1.5 adjusted to center the size-[18px] icons
    const mainIconBtnClass = "p-2 h-8 w-8 !rounded-md"
    const interactionBtnClass = "p-1.5 h-8 w-8 !rounded"

    return (
        <div data-scheme="secondary" className="bg-primary flex w-full h-[44px] items-center px-2 border-t border-primary select-none gap-2 justify-between">

            {/* LEFT SECTION: Sidebar, Nav, Separator, Bookmark, Comment */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <div className="flex items-center">
                    {hasLeftSidebar && (
                        <Tooltip
                            trigger={
                                <OSButton
                                    size="sm"
                                    onClick={onToggleNav}
                                    active={isNavVisible}
                                    className={mainIconBtnClass}
                                >
                                    {isNavVisible ? (
                                        <IconSidebarOpen className={`${navIconClassName} size-[18px]`} />
                                    ) : (
                                        <IconSidebarClose className={`${navIconClassName} size-[18px]`} />
                                    )}
                                </OSButton>
                            }
                        >
                            {isNavVisible ? 'Hide' : 'Show'} sidebar
                        </Tooltip>
                    )}
                </div>

                {/* Back/Forward buttons */}
                {(showBack || showForward) && (
                    <div className="hidden sm:flex items-center gap-0.5 ml-1 pl-1 border-l border-primary/10 h-5">
                        {showBack && (
                            <OSButton
                                size="sm"
                                onClick={goBack}
                                disabled={!canGoBack}
                                className="p-1 h-8 w-8 !rounded-md"
                            >
                                <IconChevronLeft className={`size-[18px] ${canGoBack ? 'opacity-100' : 'opacity-30'}`} />
                            </OSButton>
                        )}
                        {showForward && (
                            <OSButton
                                size="sm"
                                onClick={goForward}
                                disabled={!canGoForward}
                                className="p-1 h-8 w-8 !rounded-md"
                            >
                                <IconChevronRight className={`size-[18px] ${canGoForward ? 'opacity-100' : 'opacity-30'}`} />
                            </OSButton>
                        )}
                    </div>
                )}

                {/* Separator */}
                <div className="w-px h-5 bg-black mx-1 flex-shrink-0" />

                {/* Bookmark & Comment */}
                <div className="flex items-center gap-0.5">
                    <Tooltip trigger={
                        <OSButton size="sm" className={interactionBtnClass} onClick={onBookmark} disabled={!onBookmark}>
                            <IconBookmark className={`size-[18px] ${onBookmark ? 'text-black' : 'text-black/30'}`} />
                        </OSButton>
                    } side="bottom">bookmark</Tooltip>

                    <Tooltip trigger={
                        <OSButton size="sm" className={interactionBtnClass} onClick={onComment} disabled={!onComment}>
                            <MessageSquare className={`size-[18px] ${onComment ? 'text-black' : 'text-black/30'}`} />
                        </OSButton>
                    } side="bottom">comment</Tooltip>
                </div>
            </div>

            {/* RIGHT SECTION: Alignments, Separator, Search, TOC */}
            <div className="flex items-center gap-1 justify-end flex-shrink-0">
                {rightActionButtons}

                {/* Alignment Tools */}
                <div className="flex items-center gap-0.5">
                    <Tooltip trigger={
                        <OSButton size="sm" className={interactionBtnClass} onClick={onAlignLeft} disabled={!onAlignLeft}>
                            <AlignLeft className={`size-[18px] ${onAlignLeft ? 'text-black' : 'text-black/30'}`} />
                        </OSButton>
                    } side="bottom">align left</Tooltip>

                    <Tooltip trigger={
                        <OSButton size="sm" className={interactionBtnClass} onClick={onAlignCenter} disabled={!onAlignCenter}>
                            <AlignCenter className={`size-[18px] ${onAlignCenter ? 'text-black' : 'text-black/30'}`} />
                        </OSButton>
                    } side="bottom">align center</Tooltip>

                    <Tooltip trigger={
                        <OSButton size="sm" className={interactionBtnClass} onClick={onAlignRight} disabled={!onAlignRight}>
                            <AlignRight className={`size-[18px] ${onAlignRight ? 'text-black' : 'text-black/30'}`} />
                        </OSButton>
                    } side="bottom">align right</Tooltip>
                </div>

                {/* Separator */}
                <div className="w-px h-5 bg-black mx-1 flex-shrink-0" />

                {/* Search & TOC */}
                <div className="flex items-center gap-1 relative">
                    {showSearch && (
                        <Tooltip
                            trigger={
                                <OSButton size="sm" className={mainIconBtnClass} onClick={toggleSearch} active={searchOpen}>
                                    <IconSearch className="size-[18px]" />
                                </OSButton>
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
                                <OSButton
                                    size="sm"
                                    onClick={onToggleToc}
                                    active={isTocVisible}
                                    className={`${mainIconBtnClass} ${!compact ? '!w-auto !px-2' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <IconTableOfContents className="size-[18px]" />
                                        {!compact && (
                                            <div className="hidden lg:flex flex-col items-start leading-none text-left min-w-[60px]">
                                                <span className="text-[9px] font-bold opacity-60">contents</span>
                                                <span className="text-[11px] font-bold truncate max-w-[80px]">{title}</span>
                                            </div>
                                        )}
                                    </div>
                                </OSButton>
                            }
                        >
                            {isTocVisible ? 'hide' : 'show'} table of contents
                        </Tooltip>
                    )}
                </div>
            </div>
        </div>
    )
}
