import React from 'react'
import { LemonButton, LemonTag } from '~nb-lib/lemon-ui/index'
import { IconExpand } from '@posthog/icons'

export type NotebookChromeSyncStatus = 'saved' | 'edited' | 'local' | 'error' | 'offline'

export interface NotebookSyncInfoProps {
    syncStatus: NotebookChromeSyncStatus
    message?: string
    onRetry?: () => void
}

export function NotebookSyncInfo({ syncStatus, message, onRetry }: NotebookSyncInfoProps): JSX.Element {
    const tagTypes: Record<NotebookChromeSyncStatus, 'completion' | 'warning' | 'danger' | 'default'> = {
        saved: 'completion',
        edited: 'warning',
        local: 'default',
        error: 'danger',
        offline: 'warning',
    }

    const statusText: Record<NotebookChromeSyncStatus, string> = {
        saved: 'Saved',
        edited: 'Unsaved',
        local: 'Local',
        error: 'Sync failed',
        offline: 'Offline',
    }

    const title =
        message ||
        (syncStatus === 'saved'
            ? 'Saved on this device. Cloud sync is up to date.'
            : syncStatus === 'edited'
              ? 'Unsaved local changes'
              : syncStatus === 'error'
                ? 'Cloud sync failed. Notebook is still saved on this device.'
                : syncStatus === 'offline'
                  ? 'Offline. Notebook is saved on this device.'
                  : 'Saved on this device only')

    const canRetry = (syncStatus === 'error' || syncStatus === 'offline') && Boolean(onRetry)

    return (
        <LemonTag
            type={tagTypes[syncStatus]}
            size="small"
            className={`font-semibold text-[10px] tracking-wider uppercase select-none ${canRetry ? 'cursor-pointer' : ''}`}
            title={canRetry ? `${title} Click to retry.` : title}
            onClick={canRetry ? onRetry : undefined}
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
    syncStatus: NotebookChromeSyncStatus
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
