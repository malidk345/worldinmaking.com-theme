import React, { useState } from 'react'
import { IconDownload, IconGear, IconShare } from '@posthog/icons'
import OSButton from 'components/OSButton'
import Link from 'components/Link'
import { Popover } from 'components/RadixUI/Popover'
import { ToggleGroup } from 'components/RadixUI/ToggleGroup'
import { Fieldset } from 'components/OSFieldset'
import type { NotebookPresencePerson } from './notebookPresence'
import type { NotebookChromeSettings, NotebookAutosaveMs, NotebookFontSize } from './notebookChromeSettings'
import type { NotebookSearchHit, NotebookCommentItem } from './notebookSidebarModel'
import { jumpToNotebookHit } from './notebookSidebarModel'
import {
    exportNotebookAsJSON,
    exportNotebookAsMarkdown,
    exportNotebookAsPaperMarkdown,
    downloadTextFile,
    getNotebook,
} from './notebookStorage'
import { notebookFilename } from './outlineModel'
import { exportNotebookAsPdf } from './exportNotebookPdf'
import type { NotebookShareTab } from './NotebookShareModal'

export function NotebookSettingsPopover({
    settings,
    onChange,
}: {
    settings: NotebookChromeSettings
    onChange: (next: Partial<NotebookChromeSettings>) => void
}): JSX.Element {
    return (
        <Popover
            title="Options"
            header
            dataScheme="primary"
            side="top"
            align="end"
            trigger={
                <span>
                    <OSButton icon={<IconGear />} size="md" aria-label="Settings" />
                </span>
            }
            contentClassName="w-[234px]"
        >
            <div className="flex flex-col gap-2 px-1 pb-1">
                <Fieldset legend="Layout">
                    <ToggleGroup
                        title="Width"
                        size="sm"
                        value={settings.wide ? 'full' : 'compact'}
                        onValueChange={(value) => {
                            if (!value) return
                            onChange({ wide: value === 'full' })
                        }}
                        options={[
                            { label: 'Compact', value: 'compact' },
                            { label: 'Wide', value: 'full' },
                        ]}
                    />
                    <ToggleGroup
                        title="Text size"
                        size="sm"
                        value={settings.fontSize}
                        onValueChange={(value) => {
                            if (value === 'sm' || value === 'md' || value === 'lg') {
                                onChange({ fontSize: value as NotebookFontSize })
                            }
                        }}
                        options={[
                            { label: 'S', value: 'sm' },
                            { label: 'M', value: 'md' },
                            { label: 'L', value: 'lg' },
                        ]}
                    />
                </Fieldset>
                <Fieldset legend="Editor">
                    <ToggleGroup
                        title="Autosave"
                        size="sm"
                        value={String(settings.autosaveMs)}
                        onValueChange={(value) => {
                            const ms = Number(value) as NotebookAutosaveMs
                            if (ms === 800 || ms === 1100 || ms === 2500) onChange({ autosaveMs: ms })
                        }}
                        options={[
                            { label: 'Fast', value: '800' },
                            { label: 'Normal', value: '1100' },
                            { label: 'Slow', value: '2500' },
                        ]}
                    />
                    <ToggleGroup
                        title="Spellcheck"
                        size="sm"
                        value={settings.spellcheck ? 'on' : 'off'}
                        onValueChange={(value) => {
                            if (!value) return
                            onChange({ spellcheck: value === 'on' })
                        }}
                        options={[
                            { label: 'On', value: 'on' },
                            { label: 'Off', value: 'off' },
                        ]}
                    />
                </Fieldset>
                <p className="text-[13px] m-0 text-secondary">
                    Light/dark in{' '}
                    <Link href="/display-options" state={{ newWindow: true }} className="font-semibold underline">
                        desktop settings
                    </Link>
                    .
                </p>
            </div>
        </Popover>
    )
}

export function NotebookShareButton({ onShare }: { onShare: (tab?: NotebookShareTab) => void }): JSX.Element {
    return (
        <OSButton size="md" icon={<IconShare />} aria-label="Share" tooltip="Share" onClick={() => onShare('private')} />
    )
}

export function NotebookExportButton({ notebookId }: { notebookId: string }): JSX.Element {
    const [pdfBusy, setPdfBusy] = useState(false)
    const title = () => getNotebook(notebookId)?.title || 'notebook'

    const handlePdf = async () => {
        if (pdfBusy) return
        setPdfBusy(true)
        try {
            await exportNotebookAsPdf(notebookId)
        } finally {
            setPdfBusy(false)
        }
    }

    return (
        <Popover
            title="Export"
            header
            dataScheme="primary"
            side="top"
            align="end"
            trigger={
                <span>
                    <OSButton size="md" icon={<IconDownload />} aria-label="Export" />
                </span>
            }
            contentClassName="w-[234px]"
        >
            <div className="flex flex-col gap-1 px-1 pb-1">
                <OSButton
                    size="sm"
                    width="full"
                    align="left"
                    hover="background"
                    onClick={() => {
                        downloadTextFile(
                            notebookFilename(title(), 'md'),
                            exportNotebookAsMarkdown(notebookId),
                            'text/markdown;charset=utf-8'
                        )
                    }}
                >
                    Markdown (.md)
                </OSButton>
                <OSButton
                    size="sm"
                    width="full"
                    align="left"
                    hover="background"
                    onClick={() => {
                        downloadTextFile(
                            notebookFilename(title(), 'paper.md'),
                            exportNotebookAsPaperMarkdown(notebookId),
                            'text/markdown;charset=utf-8'
                        )
                    }}
                >
                    Paper (.md)
                </OSButton>
                <OSButton
                    size="sm"
                    width="full"
                    align="left"
                    hover="background"
                    onClick={() => {
                        downloadTextFile(
                            notebookFilename(title(), 'json'),
                            exportNotebookAsJSON(notebookId),
                            'application/json;charset=utf-8'
                        )
                    }}
                >
                    JSON
                </OSButton>
                <OSButton
                    size="sm"
                    width="full"
                    align="left"
                    hover="background"
                    disabled={pdfBusy}
                    onClick={() => {
                        void handlePdf()
                    }}
                >
                    {pdfBusy ? 'Preparing PDF…' : 'PDF'}
                </OSButton>
                <OSButton size="sm" width="full" align="left" hover="background" onClick={() => window.print()}>
                    Print
                </OSButton>
            </div>
        </Popover>
    )
}

export function SidebarSearchHits({
    hits,
    containerRef,
    onJump,
}: {
    hits: NotebookSearchHit[]
    containerRef?: React.RefObject<HTMLElement | null>
    onJump?: () => void
}): JSX.Element {
    if (hits.length === 0) {
        return <p className="text-sm text-muted m-0 px-1">No matches in this notebook.</p>
    }
    return (
        <div data-sidebar-label className="not-prose">
            <h4 className="font-semibold text-muted m-0 mb-1 text-sm">In this notebook</h4>
            <ul className="list-none m-0 p-0 flex flex-col">
                {hits.map((hit) => (
                    <li key={hit.id} className="m-0 p-0">
                        <button
                            type="button"
                            className="w-full text-left text-sm text-primary py-1 px-1 bg-transparent border-0 cursor-pointer hover:underline"
                            onClick={() => {
                                jumpToNotebookHit(hit.id, containerRef?.current ?? null)
                                onJump?.()
                            }}
                        >
                            {hit.text}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export function SidebarComments({
    comments,
    containerRef,
    onJump,
}: {
    comments: NotebookCommentItem[]
    containerRef?: React.RefObject<HTMLElement | null>
    onJump?: () => void
}): JSX.Element {
    if (comments.length === 0) {
        return <p className="text-sm text-muted m-0 px-1">No comments or invite notes yet.</p>
    }
    return (
        <div data-sidebar-label className="not-prose">
            <h4 className="font-semibold text-muted m-0 mb-1 text-sm">Notes</h4>
            <ul className="list-none m-0 p-0 flex flex-col">
                {comments.map((item) => (
                    <li key={item.id} className="m-0 p-0">
                        <button
                            type="button"
                            className="w-full text-left py-1.5 px-1 bg-transparent border-0 cursor-pointer hover:bg-accent rounded"
                            onClick={() => {
                                jumpToNotebookHit(item.nodeId, containerRef?.current ?? null)
                                onJump?.()
                            }}
                        >
                            <span className="block text-[11px] text-muted truncate">
                                {item.author}
                                {item.kind ? ` · ${item.kind}` : ''}
                            </span>
                            <span className="block text-sm text-primary leading-snug">{item.text}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export function SidebarPeople({ people }: { people: NotebookPresencePerson[] }): JSX.Element {
    if (people.length === 0) {
        return <p className="text-sm text-muted m-0 px-1">You are the only one here.</p>
    }
    return (
        <div data-sidebar-label className="not-prose">
            <h4 className="font-semibold text-muted m-0 mb-1 text-sm">Here now</h4>
            <ul className="list-none m-0 p-0 flex flex-col">
                {people.map((person) => (
                    <li key={person.clientId} className="flex items-center gap-2 py-1.5 px-1">
                        <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{ background: person.color }}
                            aria-hidden
                        />
                        <span className="text-sm text-primary truncate">{person.name}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
