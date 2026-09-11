import React, { useState } from 'react'
import { IconComment, IconDownload, IconGear } from '@posthog/icons'
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
    getNotebookWithContent,
} from './notebookStorage'
import { notebookFilename } from './outlineModel'
import { exportNotebookAsPdf, printNotebook } from './exportNotebookPdf'
import { useToast } from '../../../context/Toast'

export function NotebookSettingsPanel({
    settings,
    onChange,
    extra,
}: {
    settings: NotebookChromeSettings
    onChange: (next: Partial<NotebookChromeSettings>) => void
    extra?: React.ReactNode
}): JSX.Element {
    return (
        <div className="w-full h-full bg-primary text-primary space-y-2">
            <Fieldset legend="Layout">
                <div className="grid grid-cols-2 gap-2">
                    <ToggleGroup
                        title="Content width"
                        size="sm"
                        value={settings.wide ? 'full' : 'compact'}
                        onValueChange={(value) => {
                            if (!value) return
                            onChange({ wide: value === 'full' })
                        }}
                        options={[
                            { label: 'Fixed', value: 'compact' },
                            { label: 'Full', value: 'full' },
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
                </div>
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
            {extra}
            <p className="text-[13px]">
                Toggle light/dark mode in{' '}
                <span className="inline-flex items-center gap-0.5">
                    <Link href="/display-options" state={{ newWindow: true }} className="font-semibold underline">
                        desktop settings
                    </Link>
                </span>
            </p>
        </div>
    )
}

export function NotebookSettingsPopover({
    settings,
    onChange,
    extra,
}: {
    settings: NotebookChromeSettings
    onChange: (next: Partial<NotebookChromeSettings>) => void
    extra?: React.ReactNode
}): JSX.Element {
    return (
        <Popover
            title="Options"
            dataScheme="secondary"
            trigger={
                <span>
                    <OSButton icon={<IconGear />} size="md" />
                </span>
            }
            contentClassName="w-80"
        >
            <NotebookSettingsPanel settings={settings} onChange={onChange} extra={extra} />
        </Popover>
    )
}

export function NotebookExportPanel({ notebookId }: { notebookId: string }): JSX.Element {
    const [pdfBusy, setPdfBusy] = useState(false)
    const [printBusy, setPrintBusy] = useState(false)
    const { addToast } = useToast()
    const title = () => getNotebook(notebookId)?.title || 'notebook'

    const withBody = async (): Promise<Awaited<ReturnType<typeof getNotebookWithContent>>> => {
        const notebook = await getNotebookWithContent(notebookId)
        if (!notebook || notebook.contentOmitted) {
            addToast({ description: 'Could not load the notebook body for export.', error: true })
            return undefined
        }
        return notebook
    }

    const handlePdf = async () => {
        if (pdfBusy) return
        setPdfBusy(true)
        try {
            const ok = await exportNotebookAsPdf(notebookId)
            addToast(
                ok
                    ? { description: 'PDF downloaded' }
                    : { description: 'Could not export PDF. Try Print instead.', error: true }
            )
        } finally {
            setPdfBusy(false)
        }
    }

    const handlePrint = async () => {
        if (printBusy) return
        setPrintBusy(true)
        try {
            const ok = await printNotebook(notebookId)
            if (!ok) addToast({ description: 'Could not open print preview.', error: true })
        } finally {
            setPrintBusy(false)
        }
    }

    return (
            <div className="flex flex-col gap-1 px-1 pb-1">
                <h4 className="font-semibold text-muted m-0 px-1 text-sm">Export</h4>
                <OSButton
                    size="sm"
                    width="full"
                    align="left"
                    hover="background"
                    onClick={() => {
                        void withBody().then((notebook) => {
                            if (!notebook) return
                            downloadTextFile(
                                notebookFilename(notebook.title || title(), 'md'),
                                exportNotebookAsMarkdown(notebookId),
                                'text/markdown;charset=utf-8'
                            )
                        })
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
                        void withBody().then((notebook) => {
                            if (!notebook) return
                            downloadTextFile(
                                notebookFilename(notebook.title || title(), 'paper.md'),
                                exportNotebookAsPaperMarkdown(notebookId),
                                'text/markdown;charset=utf-8'
                            )
                        })
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
                        void withBody().then((notebook) => {
                            if (!notebook) return
                            downloadTextFile(
                                notebookFilename(notebook.title || title(), 'json'),
                                exportNotebookAsJSON(notebookId),
                                'application/json;charset=utf-8'
                            )
                        })
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
                <OSButton
                    size="sm"
                    width="full"
                    align="left"
                    hover="background"
                    disabled={printBusy}
                    onClick={() => {
                        void handlePrint()
                    }}
                >
                    {printBusy ? 'Preparing print…' : 'Print'}
                </OSButton>
            </div>
    )
}

export function NotebookExportButton({ notebookId }: { notebookId: string }): JSX.Element {
    return (
        <Popover
            title="Export"
            header
            dataScheme="primary"
            side="bottom"
            align="end"
            trigger={
                <span>
                    <OSButton size="md" icon={<IconDownload />} tooltip="Export" />
                </span>
            }
            contentClassName="w-[min(18rem,calc(100vw-1.5rem))] z-[80]"
        >
            <NotebookExportPanel notebookId={notebookId} />
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
    return (
        <div data-sidebar-label className="not-prose">
            <h4 className="font-semibold text-muted m-0 mb-1 px-1 text-sm">Notes</h4>
            {comments.length === 0 ? (
                <p className="text-sm text-muted m-0 px-1 leading-snug">No comments or invite notes yet.</p>
            ) : (
                <div className="flex flex-col gap-px">
                    {comments.map((item) => (
                        <OSButton
                            key={item.id}
                            type="button"
                            align="left"
                            width="full"
                            size="md"
                            hover="background"
                            onClick={() => {
                                jumpToNotebookHit(item.nodeId, containerRef?.current ?? null)
                                onJump?.()
                            }}
                            className="!items-start !h-auto"
                        >
                            <span className="block min-w-0">
                                <span className="block text-[11px] text-muted truncate">
                                    {item.author}
                                    {item.kind ? ` · ${item.kind}` : ''}
                                </span>
                                <span className="block text-sm text-primary leading-snug">{item.text}</span>
                            </span>
                        </OSButton>
                    ))}
                </div>
            )}
        </div>
    )
}

export function SidebarPeople({ people }: { people: NotebookPresencePerson[] }): JSX.Element {
    return (
        <div className="not-prose px-1 pb-1">
            <h4 className="font-semibold text-muted m-0 mb-2 text-sm">Here now</h4>
            {people.length === 0 ? (
                <p className="text-sm text-muted m-0 leading-snug">You are the only one here.</p>
            ) : (
                <ul className="list-none m-0 p-0 flex flex-col gap-1">
                    {people.map((person) => (
                        <li key={person.clientId} className="flex items-center gap-2 py-1">
                            <span
                                className="size-2.5 rounded-full shrink-0"
                                style={{ background: person.color }}
                                aria-hidden
                            />
                            <span className="text-sm text-primary truncate">{person.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export function NotebookPeopleButton({ people }: { people: NotebookPresencePerson[] }): JSX.Element {
    const count = people.length
    return (
        <Popover
            header
            title="Here now"
            dataScheme="secondary"
            side="bottom"
            align="end"
            contentClassName="w-[min(16rem,calc(100vw-1.5rem))] z-[80]"
            trigger={
                <span>
                    <OSButton size="md" tooltip={count ? `${count} here now` : 'Who’s here'}>
                        <span className="flex items-center gap-0.5">
                            {count === 0 ? (
                                <span className="size-2 rounded-full bg-muted" />
                            ) : (
                                people.slice(0, 3).map((person) => (
                                    <span
                                        key={person.clientId}
                                        className="size-2.5 rounded-full"
                                        style={{ background: person.color }}
                                    />
                                ))
                            )}
                        </span>
                    </OSButton>
                </span>
            }
        >
            <SidebarPeople people={people} />
        </Popover>
    )
}

export function NotebookNotesButton({
    comments,
    containerRef,
}: {
    comments: NotebookCommentItem[]
    containerRef?: React.RefObject<HTMLElement | null>
}): JSX.Element {
    const [open, setOpen] = useState(false)
    return (
        <Popover
            header
            title="Notes"
            dataScheme="secondary"
            side="bottom"
            align="start"
            open={open}
            onOpenChange={setOpen}
            contentClassName="w-[min(18rem,calc(100vw-1.5rem))] max-h-[min(24rem,70dvh)] overflow-y-auto z-[80]"
            trigger={
                <span>
                    <OSButton
                        size="md"
                        icon={<IconComment />}
                        tooltip="Notes"
                        active={open}
                    />
                </span>
            }
        >
            <SidebarComments
                comments={comments}
                containerRef={containerRef}
                onJump={() => setOpen(false)}
            />
        </Popover>
    )
}
