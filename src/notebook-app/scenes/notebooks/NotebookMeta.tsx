import React from 'react'
import { LemonButton, LemonTag } from '@posthog/lemon-ui'
import { IconExpand } from '@posthog/icons'

export interface NotebookSyncInfoProps {
    syncStatus: 'saved' | 'edited' | 'local'
}

export function NotebookSyncInfo({ syncStatus }: NotebookSyncInfoProps): JSX.Element {
    const tagTypes: Record<NotebookSyncInfoProps['syncStatus'], 'completion' | 'warning' | 'default'> = {
        saved: 'completion',
        edited: 'warning',
        local: 'default',
    }

    const statusText: Record<NotebookSyncInfoProps['syncStatus'], string> = {
        saved: 'Saved',
        edited: 'Unsaved',
        local: 'Local',
    }

    return (
        <LemonTag
            type={tagTypes[syncStatus]}
            size="small"
            className="font-semibold text-[10px] tracking-wider uppercase select-none"
            title={syncStatus === 'saved' ? 'All changes saved to storage' : 'Unsaved local changes'}
        >
            {statusText[syncStatus]}
        </LemonTag>
    )
}

export interface NotebookExpandButtonProps {
    isExpanded: boolean
    onToggleExpand: () => void
    type?: 'primary' | 'secondary' | 'stealth'
    size?: 'small' | 'medium'
}

export function NotebookExpandButton({
    isExpanded,
    onToggleExpand,
    type = 'secondary',
    size = 'small',
}: NotebookExpandButtonProps): JSX.Element {
    return (
        <LemonButton
            size={size}
            type={type}
            icon={<IconExpand />}
            active={isExpanded}
            onClick={onToggleExpand}
            tooltip={isExpanded ? 'Compact view' : 'Fill content width'}
        />
    )
}

interface NotebookMetaBarProps {
    syncStatus: 'saved' | 'edited' | 'local'
    lastModified?: string
    isExpanded: boolean
    onToggleExpand: () => void
}

export function NotebookMetaBar({
    syncStatus,
    isExpanded,
    onToggleExpand,
}: NotebookMetaBarProps): JSX.Element {
    return (
        <div className="flex items-center gap-2 text-xs text-muted">
            <NotebookSyncInfo syncStatus={syncStatus} />
            <NotebookExpandButton isExpanded={isExpanded} onToggleExpand={onToggleExpand} />
        </div>
    )
}
