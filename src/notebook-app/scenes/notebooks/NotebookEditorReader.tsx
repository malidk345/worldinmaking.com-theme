import React, { useMemo } from 'react'
import ReaderView, { type MenuTab } from 'components/ReaderView'
import {
    IconClockRewind,
    IconComment,
    IconCopy,
    IconGlobe,
    IconShare,
    IconTableOfContents,
    IconTrash,
} from '@posthog/icons'
import OSButton from 'components/OSButton'
import { NotebookOutline } from './NotebookOutline'
import { NotebookHistoryPanel } from './NotebookHistory'
import {
    NotebookExportPanel,
    NotebookSettingsPopover,
    SidebarComments,
    SidebarPeople,
} from './notebookSidebarPanels'
import { extractNotebookComments } from './notebookSidebarModel'
import { NotebookInvitePanel, NotebookPublishPanel } from './NotebookShareModal'
import type { NotebookPresencePerson } from './notebookPresence'
import type { NotebookChromeSettings } from './notebookChromeSettings'
import type { NotebookPublishPayload } from './NotebookShareModal'

interface NotebookEditorReaderProps {
    markdown: string
    containerRef?: React.RefObject<HTMLElement | null>
    children: React.ReactNode
    notebookId?: string
    notebookTitle?: string
    currentContent?: string
    onSnapshotNow?: () => void
    onHistoryRestored?: (payload: { content: string; title: string }) => void
    people?: NotebookPresencePerson[]
    chrome?: NotebookChromeSettings
    onChromeChange?: (next: Partial<NotebookChromeSettings>) => void
    onDuplicate?: () => void
    onDelete?: () => void
    onPublish?: (meta: NotebookPublishPayload) => void
    stickyHeader?: React.ReactNode
}

function closeMobileReaderNav() {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event('wim-reader-mobile-close'))
}

export function openNotebookSidebarTab(value: string): void {
    if (typeof window === 'undefined' || !value) return
    window.dispatchEvent(new CustomEvent('wim-notebook-sidebar-tab', { detail: { value } }))
    window.dispatchEvent(new Event('wim-reader-mobile-open'))
}

export function NotebookEditorReader({
    markdown,
    containerRef,
    children,
    notebookId,
    notebookTitle,
    currentContent,
    onSnapshotNow,
    onHistoryRestored,
    people = [],
    chrome,
    onChromeChange,
    onDuplicate,
    onDelete,
    onPublish,
    stickyHeader,
}: NotebookEditorReaderProps): JSX.Element {
    const comments = useMemo(
        () => extractNotebookComments(currentContent || markdown),
        [currentContent, markdown]
    )

    const outline = (
        <NotebookOutline markdown={markdown} containerRef={containerRef} onNavigate={closeMobileReaderNav} />
    )

    const notes = (
        <SidebarComments comments={comments} containerRef={containerRef} onJump={closeMobileReaderNav} />
    )

    const history =
        notebookId && onSnapshotNow && onHistoryRestored ? (
            <NotebookHistoryPanel
                notebookId={notebookId}
                currentContent={currentContent || markdown}
                currentTitle={notebookTitle}
                onSnapshotNow={onSnapshotNow}
                onRestored={(payload) => {
                    onHistoryRestored(payload)
                    closeMobileReaderNav()
                }}
            />
        ) : null

    const share = notebookId ? (
        <div data-sidebar-label className="flex flex-col gap-3">
            <NotebookInvitePanel notebookId={notebookId} isOpen />
            <NotebookExportPanel notebookId={notebookId} />
        </div>
    ) : null

    const publish =
        notebookId && onPublish ? (
            <div data-sidebar-label>
                <NotebookPublishPanel
                    notebookId={notebookId}
                    notebookTitle={notebookTitle || ''}
                    isOpen
                    onPublish={onPublish}
                />
            </div>
        ) : null

    const optionsExtra = (
        <>
            {people.length ? <SidebarPeople people={people} /> : null}
            {notebookId ? <NotebookExportPanel notebookId={notebookId} /> : null}
            {onDuplicate ? (
                <OSButton size="sm" width="full" hover="background" icon={<IconCopy />} onClick={onDuplicate}>
                    Duplicate
                </OSButton>
            ) : null}
            {onDelete ? (
                <OSButton size="sm" width="full" hover="background" icon={<IconTrash />} onClick={onDelete}>
                    <span className="text-red">Delete</span>
                </OSButton>
            ) : null}
        </>
    )

    const menuTabs: MenuTab[] = [
        {
            label: 'Contents',
            value: 'contents',
            default: true,
            icon: <IconTableOfContents className="size-4" />,
            menu: <div data-sidebar-label>{outline}</div>,
        },
        {
            label: 'Notes',
            value: 'notes',
            icon: <IconComment className="size-4" />,
            menu: <div data-sidebar-label>{notes}</div>,
        },
        ...(history
            ? [
                  {
                      label: 'History',
                      value: 'history',
                      icon: <IconClockRewind className="size-4" />,
                      menu: <div data-sidebar-label>{history}</div>,
                  } satisfies MenuTab,
              ]
            : []),
        ...(share
            ? [
                  {
                      label: 'Share',
                      value: 'share',
                      icon: <IconShare className="size-4" />,
                      flyout: 'right',
                      menu: share,
                  } satisfies MenuTab,
              ]
            : []),
        ...(publish
            ? [
                  {
                      label: 'Publish on WIM',
                      value: 'publish',
                      icon: <IconGlobe className="size-4" />,
                      flyout: 'right',
                      menu: publish,
                  } satisfies MenuTab,
              ]
            : []),
    ]

    return (
        <div className="flex h-full min-h-0 flex-col">
            {stickyHeader ? (
                <div className="not-prose shrink-0 z-30 px-2 pt-2 pb-1 @md:px-3 @md:pt-3">
                    <div className="notebook-topbar-glass overflow-hidden">{stickyHeader}</div>
                </div>
            ) : null}
            <ReaderView
                hideTitle
                showQuestions={false}
                showAbout={false}
                hideMobileTableOfContents
                hideAppOptions
                hideBookmark
                hideRightSidebar
                padding={true}
                className="h-full min-h-0 flex-1"
                menuTabs={menuTabs}
                menuTabsLayout="list"
                rightActionButtons={
                    chrome && onChromeChange ? (
                        <NotebookSettingsPopover
                            settings={chrome}
                            onChange={onChromeChange}
                            extra={optionsExtra}
                        />
                    ) : undefined
                }
            >
                <div className="min-w-0 flex-1 py-2">{children}</div>
            </ReaderView>
        </div>
    )
}
