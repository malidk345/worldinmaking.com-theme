import React, { useState } from 'react'
import { IconComment, IconDownload, IconGear } from '@posthog/icons'
import OSButton from 'components/OSButton'
import Link from 'components/Link'
import { Popover } from 'components/RadixUI/Popover'
import { ToggleGroup } from 'components/RadixUI/ToggleGroup'
import { Fieldset } from 'components/OSFieldset'
import type { NotebookPresencePerson } from './notebookPresence'
import type { NotebookChromeSettings, NotebookAutosaveMs } from './notebookChromeSettings'
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
