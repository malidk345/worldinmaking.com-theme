import React, { Component, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    IconComment,
    IconNotebook,
    IconPeople,
    IconPlus,
    IconSidebarClose,
    IconSidebarOpen,
    IconTableOfContents,
} from '@posthog/icons'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'
import Tooltip from 'components/RadixUI/Tooltip'
import { InlineSearch } from 'components/Search/InlineSearch'
import SearchProvider, { useSearch } from 'components/Editor/SearchProvider'
import { PANEL_BG } from 'constants/frostedSurfaces'
import { useAppSettings } from '../../../context/App'
import { NotebookOutline } from './NotebookOutline'
import { NotebookHistoryButton } from './NotebookHistory'
import type { NotebookPresencePerson } from './notebookPresence'
import type { NotebookChromeSettings } from './notebookChromeSettings'
import type { NotebookShareTab } from './NotebookShareModal'
import { extractNotebookComments, extractNotebookSearchHits } from './notebookSidebarModel'
import {
    NotebookExportButton,
    NotebookSettingsPopover,
    NotebookShareButton,
    SidebarComments,
    SidebarPeople,
    SidebarSearchHits,
} from './notebookSidebarPanels'

export type NotebookSidebarItem = {
    id: string
    title: string
}

interface NotebookToolsSidebarProps {
    markdown: string
    containerRef?: React.RefObject<HTMLElement | null>
    /** Article column — mobile FAB portals here, same as ReaderView. */
    articleRef?: React.RefObject<HTMLDivElement | null>
    notebooks?: NotebookSidebarItem[]
    activeNotebookId?: string
    notebookTitle?: string
    currentContent?: string
    onSelectNotebook?: (id: string) => void
    onCreateNotebook?: () => void
    onSnapshotNow?: () => void
    onHistoryRestored?: (payload: { content: string; title: string }) => void
    chrome?: NotebookChromeSettings
    onChromeChange?: (next: Partial<NotebookChromeSettings>) => void
    onShare?: (tab?: NotebookShareTab) => void
    people?: NotebookPresencePerson[]
}

const SIDEBAR_WIDTH = 250
const PIN_KEY = 'notebook-sidebar-pinned'
const SIDEBAR_CSS_TRANSITION = 'width 300ms cubic-bezier(0.32, 0.72, 0, 1)'

type RailTab = 'notebooks' | 'outline' | 'notes' | 'people'

/**
 * ReaderView left-rail chrome for notebooks: search, notebooks tree, outline,
 * pin, bookmark, history, and settings. Desktop pinned by default; mobile is
 * a floating button + off-canvas drawer.
 */
type SidebarErrorBoundaryProps = { children: React.ReactNode }
type SidebarErrorBoundaryState = { error: Error | null }
class SidebarErrorBoundary extends Component<SidebarErrorBoundaryProps, SidebarErrorBoundaryState> {
    state: SidebarErrorBoundaryState = { error: null }
    static getDerivedStateFromError(error: Error) {
        return { error }
    }
    override render() {
        if (this.state.error) {
            return (
                <aside
                    className="notebook-tools-sidebar shrink-0 self-stretch w-[250px] min-h-[600px] border-r p-3"
                >
                    <p className="text-sm text-muted m-0">Sidebar failed to load.</p>
                    <p className="text-xs text-secondary m-0 mt-2 break-words">{this.state.error.message}</p>
                </aside>
            )
        }
        return this.props.children
    }
}

export function NotebookToolsSidebar(props: NotebookToolsSidebarProps): JSX.Element {
    return (
        <SidebarErrorBoundary>
            <SearchProvider>
                <NotebookToolsSidebarInner {...props} />
            </SearchProvider>
        </SidebarErrorBoundary>
    )
}

function NotebookToolsSidebarInner({
    markdown,
    containerRef,
    articleRef,
    notebooks = [],
    activeNotebookId,
    notebookTitle,
    currentContent,
    onSelectNotebook,
    onCreateNotebook,
    onSnapshotNow,
    onHistoryRestored,
    chrome,
    onChromeChange,
    onShare,
    people = [],
}: NotebookToolsSidebarProps): JSX.Element {
    const { isMobile } = useAppSettings()
    const { searchQuery } = useSearch()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [isPinned, setIsPinned] = useState(true)
    const [hovered, setHovered] = useState(false)
    const [searchFocused, setSearchFocused] = useState(false)
    const [activeTab, setActiveTab] = useState<RailTab>('outline')
    const [hasMounted, setHasMounted] = useState(false)
    const [fabHost, setFabHost] = useState<HTMLElement | null>(null)

    useEffect(() => {
        setHasMounted(true)
        try {
            if (localStorage.getItem(PIN_KEY) === 'false') setIsPinned(false)
        } catch {
            /* ignore */
        }
    }, [])

    // Only the phone/tablet OS layout uses the drawer. Notebook windows are
    // often < 672px wide on desktop — treating that as "mobile" hid the rail.
    const isNarrow = Boolean(isMobile)
    const expanded = isNarrow ? mobileOpen : isPinned || hovered || searchFocused

    useEffect(() => {
        setFabHost(articleRef?.current ?? null)
    }, [articleRef, isNarrow])

    useEffect(() => {
        if (!isNarrow) setMobileOpen(false)
    }, [isNarrow])

    useEffect(() => {
        if (!mobileOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [mobileOpen])

    const persistPinned = (next: boolean) => {
        setIsPinned(next)
        try {
            localStorage.setItem(PIN_KEY, next ? 'true' : 'false')
        } catch {
            /* ignore */
        }
    }

    const searching = searchQuery.trim().length >= 2
    const filteredNotebooks = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (q.length < 2) return notebooks
        return notebooks.filter((nb) => (nb.title || 'Untitled').toLowerCase().includes(q))
    }, [notebooks, searchQuery])
    const searchHits = useMemo(
        () => (searching ? extractNotebookSearchHits(currentContent || markdown, searchQuery) : []),
        [searching, currentContent, markdown, searchQuery]
    )
    const comments = useMemo(() => extractNotebookComments(currentContent || markdown), [currentContent, markdown])

    const closeMobile = () => setMobileOpen(false)

    const handleSearchFocus = () => setSearchFocused(true)
    const handleSearchBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSearchFocused(false)
    }
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') setSearchFocused(false)
    }

    const panelWidth = isNarrow ? SIDEBAR_WIDTH : expanded ? SIDEBAR_WIDTH : 48

    const railBody = (
        <>
                    <div
                        className={`flex-1 min-h-0 flex flex-col w-[250px] pt-2 [&_[data-sidebar-label]]:transition-opacity [&_[data-sidebar-label]]:duration-200 ${
                            expanded
                                ? ''
                                : '[&_[data-sidebar-label]]:opacity-0 [&_a]:!bg-transparent [&_button]:!bg-transparent [&_a]:!border-transparent [&_button]:!border-transparent'
                        }`}
                    >
                        <div
                            className="mx-2 mb-2 flex-shrink-0"
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                            onKeyDown={handleSearchKeyDown}
                        >
                            <div
                                style={{
                                    width: expanded ? 234 : 32,
                                    transition: hasMounted ? SIDEBAR_CSS_TRANSITION : 'none',
                                }}
                                className={`overflow-hidden [&_input]:transition-colors [&_input]:duration-200 ${
                                    expanded ? '' : '[&_input]:!bg-transparent [&_input]:!border-transparent'
                                }`}
                            >
                                <InlineSearch
                                    contentRef={containerRef as React.RefObject<HTMLElement>}
                                    placeholder="Search this notebook..."
                                    className="notebook-rail-search"
                                />
                            </div>
                        </div>

                        <div
                            className={`mx-2 flex-shrink-0 overflow-hidden ${
                                isPinned && !isNarrow
                                    ? 'grid grid-cols-2 gap-px'
                                    : 'flex flex-col items-stretch gap-px py-2 border-y border-secondary'
                            }`}
                            role="tablist"
                            aria-label="Sidebar mode"
                            style={{
                                width: expanded ? 234 : 32,
                                transition: hasMounted ? SIDEBAR_CSS_TRANSITION : 'none',
                            }}
                        >
                            <RailTabButton
                                active={activeTab === 'notebooks'}
                                label="Notebooks"
                                icon={<IconNotebook className="size-5" />}
                                showLabel={expanded}
                                stacked={isPinned && !isNarrow}
                                onClick={() => setActiveTab('notebooks')}
                            />
                            <RailTabButton
                                active={activeTab === 'outline'}
                                label="Outline"
                                icon={<IconTableOfContents className="size-5" />}
                                showLabel={expanded}
                                stacked={isPinned && !isNarrow}
                                onClick={() => setActiveTab('outline')}
                            />
                            <RailTabButton
                                active={activeTab === 'notes'}
                                label="Notes"
                                icon={<IconComment className="size-5" />}
                                showLabel={expanded}
                                stacked={isPinned && !isNarrow}
                                onClick={() => setActiveTab('notes')}
                            />
                            <RailTabButton
                                active={activeTab === 'people'}
                                label="Here"
                                icon={<IconPeople className="size-5" />}
                                showLabel={expanded}
                                stacked={isPinned && !isNarrow}
                                onClick={() => setActiveTab('people')}
                            />
                        </div>

                        <div
                            className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
                                expanded ? '' : 'opacity-0 pointer-events-none'
                            }`}
                            data-sidebar-label
                            aria-hidden={!expanded}
                        >
                            <ScrollArea
                                className="px-2 [mask-image:linear-gradient(to_bottom,transparent_0,black_0.75rem)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_0.75rem)]"
                                viewportClasses="pt-3 pb-3"
                            >
                                {searching ? (
                                    <>
                                        <SidebarSearchHits
                                            hits={searchHits}
                                            containerRef={containerRef}
                                            onJump={closeMobile}
                                        />
                                        <div className="mt-4">
                                            <NotebookList
                                                notebooks={filteredNotebooks}
                                                activeNotebookId={activeNotebookId}
                                                onSelectNotebook={(id) => {
                                                    onSelectNotebook?.(id)
                                                    closeMobile()
                                                }}
                                                onCreateNotebook={() => {
                                                    onCreateNotebook?.()
                                                    closeMobile()
                                                }}
                                                emptyLabel="No notebooks match this search."
                                            />
                                        </div>
                                    </>
                                ) : activeTab === 'notebooks' ? (
                                    <NotebookList
                                        notebooks={filteredNotebooks}
                                        activeNotebookId={activeNotebookId}
                                        onSelectNotebook={(id) => {
                                            onSelectNotebook?.(id)
                                            closeMobile()
                                        }}
                                        onCreateNotebook={() => {
                                            onCreateNotebook?.()
                                            closeMobile()
                                        }}
                                        emptyLabel="No notebooks yet."
                                    />
                                ) : activeTab === 'outline' ? (
                                    <NotebookOutline
                                        markdown={markdown}
                                        containerRef={containerRef}
                                        onNavigate={closeMobile}
                                    />
                                ) : activeTab === 'notes' ? (
                                    <SidebarComments
                                        comments={comments}
                                        containerRef={containerRef}
                                        onJump={closeMobile}
                                    />
                                ) : (
                                    <SidebarPeople people={people} />
                                )}
                            </ScrollArea>
                        </div>
                    </div>

                    <div
                        className={`notebook-tools-footer flex-shrink-0 border-t border-primary py-1 flex items-center ${
                            expanded ? 'pl-2.5 pr-1' : 'justify-center px-0'
                        }`}
                    >
                        <Tooltip
                            trigger={
                                <OSButton
                                    size="md"
                                    onClick={isNarrow ? closeMobile : () => persistPinned(!isPinned)}
                                    active={!isNarrow && isPinned}
                                    icon={
                                        isNarrow || isPinned ? <IconSidebarOpen /> : <IconSidebarClose />
                                    }
                                />
                            }
                            side="right"
                        >
                            {isNarrow ? 'Close' : isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                        </Tooltip>
                        {expanded ? (
                            <div className="ml-auto flex items-center gap-px">
                                {activeNotebookId && onSnapshotNow && onHistoryRestored && (
                                    <NotebookHistoryButton
                                        notebookId={activeNotebookId}
                                        currentContent={currentContent || ''}
                                        currentTitle={notebookTitle}
                                        onSnapshotNow={onSnapshotNow}
                                        onRestored={onHistoryRestored}
                                    />
                                )}
                                {onShare && <NotebookShareButton onShare={onShare} />}
                                {activeNotebookId && <NotebookExportButton notebookId={activeNotebookId} />}
                                {chrome && onChromeChange && (
                                    <NotebookSettingsPopover settings={chrome} onChange={onChromeChange} />
                                )}
                            </div>
                        ) : null}
                    </div>
        </>
    )

    return (
        <>
            {!isNarrow && (
                <aside
                    data-scheme="secondary"
                    className="notebook-tools-sidebar notebook-outline relative shrink-0 self-stretch h-full min-h-0"
                    style={{ width: panelWidth, flexBasis: panelWidth }}
                    aria-label="Notebook tools"
                    onMouseEnter={() => {
                        if (!isPinned) setHovered(true)
                    }}
                    onMouseLeave={() => setHovered(false)}
                >
                    <div
                        data-scheme="secondary"
                        className="notebook-tools-sidebar flex flex-col h-full min-h-0 overflow-hidden border-r border-primary bg-primary text-primary"
                    >
                        {railBody}
                    </div>
                </aside>
            )}

            {isNarrow && (
                <>
                    <div
                        aria-hidden
                        onClick={closeMobile}
                        className={`absolute inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
                            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    />
                    <div
                        data-scheme="secondary"
                        className={`notebook-tools-sidebar absolute inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-primary bg-primary text-primary shadow-2xl ${
                            mobileOpen ? '' : 'pointer-events-none'
                        }`}
                        style={{
                            width: SIDEBAR_WIDTH,
                            transform: mobileOpen ? 'translateX(0)' : 'translateX(-110%)',
                            transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
                        }}
                    >
                        {railBody}
                    </div>
                    {fabHost
                        ? createPortal(
                              <button
                                  type="button"
                                  aria-label="Open navigation"
                                  onClick={() => setMobileOpen(true)}
                                  className={`absolute bottom-4 right-4 z-30 flex size-11 items-center justify-center rounded-full border border-primary text-primary shadow-lg transition-opacity duration-200 hover:bg-accent ${PANEL_BG} ${
                                      mobileOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                                  }`}
                              >
                                  <IconSidebarClose className="size-5" />
                              </button>,
                              fabHost
                          )
                        : null}
                </>
            )}
        </>
    )
}

function RailTabButton({
    active,
    label,
    icon,
    showLabel,
    stacked,
    onClick,
}: {
    active: boolean
    label: string
    icon: React.ReactNode
    showLabel: boolean
    stacked: boolean
    onClick: () => void
}): JSX.Element {
    const button = (
        <button
            type="button"
            onClick={onClick}
            role="tab"
            aria-selected={active}
            aria-label={label}
            className={`relative rounded text-sm leading-tight flex w-full min-w-0 bg-transparent border-0 cursor-pointer ${
                stacked
                    ? 'flex-col items-center text-center gap-0.5 px-1 py-1.5'
                    : `min-h-7 items-center justify-start ${showLabel ? 'gap-2' : ''} px-2 py-1`
            } ${active ? 'text-primary' : 'text-secondary hover:text-primary hover:bg-accent'}`}
        >
            {active && <span className="absolute inset-0 -z-10 rounded bg-accent" />}
            <span className="inline-flex items-center justify-center shrink-0">{icon}</span>
            {showLabel && (
                <span
                    data-sidebar-label
                    className={
                        stacked
                            ? 'text-sm leading-tight w-full px-0.5 whitespace-nowrap'
                            : 'overflow-hidden whitespace-nowrap'
                    }
                >
                    {label}
                </span>
            )}
        </button>
    )
    return (
        <Tooltip trigger={button} side={stacked ? 'bottom' : 'right'} delay={400} className="w-full min-w-0">
            {label}
        </Tooltip>
    )
}

function NotebookList({
    notebooks,
    activeNotebookId,
    onSelectNotebook,
    onCreateNotebook,
    emptyLabel,
}: {
    notebooks: NotebookSidebarItem[]
    activeNotebookId?: string
    onSelectNotebook: (id: string) => void
    onCreateNotebook?: () => void
    emptyLabel: string
}): JSX.Element {
    return (
        <div data-sidebar-label className="not-prose">
            <div className="flex items-center justify-between gap-1 mb-1">
                <h4 className="font-semibold text-muted m-0 text-sm">Notebooks</h4>
                {onCreateNotebook && (
                    <OSButton size="sm" icon={<IconPlus />} onClick={onCreateNotebook} tooltip="New notebook" />
                )}
            </div>
            {notebooks.length === 0 ? (
                <p className="text-sm text-muted m-0 leading-snug">{emptyLabel}</p>
            ) : (
                <ul className="list-none m-0 p-0 flex flex-col">
                    {notebooks.map((nb) => (
                        <li key={nb.id} className="m-0 p-0">
                            <OSButton
                                active={nb.id === activeNotebookId}
                                align="left"
                                width="full"
                                size="md"
                                hover="background"
                                onClick={() => onSelectNotebook(nb.id)}
                            >
                                <span className="truncate">{nb.title?.trim() || 'Untitled'}</span>
                            </OSButton>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}


