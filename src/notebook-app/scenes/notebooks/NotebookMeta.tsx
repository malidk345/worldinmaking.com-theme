import React from 'react'
import { IconExpand } from '@posthog/icons'
import Label from 'components/Label'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'

export type NotebookChromeSyncStatus = 'saved' | 'edited' | 'local' | 'error' | 'offline'

export interface NotebookSyncInfoProps {
    syncStatus: NotebookChromeSyncStatus
    message?: string
    onRetry?: () => void
}

export function NotebookSyncInfo({ syncStatus, message, onRetry }: NotebookSyncInfoProps): JSX.Element {
    const statusText: Record<NotebookChromeSyncStatus, string> = {
        saved: 'Saved',
        edited: 'Saving…',
        local: 'Local',
        error: 'Sync failed',
        offline: 'Offline',
    }

    const title =
        message ||
        (syncStatus === 'saved'
            ? 'Saved on this device. Cloud sync is up to date.'
            : syncStatus === 'edited'
              ? 'Saving on this device…'
              : syncStatus === 'error'
                ? 'Cloud sync failed. Notebook is still saved on this device.'
                : syncStatus === 'offline'
                  ? 'Offline. Notebook is saved on this device.'
                  : 'Saved on this device only')

    const canRetry = (syncStatus === 'error' || syncStatus === 'offline') && Boolean(onRetry)

    return (
        <Tooltip
            trigger={
                <button
                    type="button"
                    onClick={canRetry ? onRetry : undefined}
                    className={`inline-flex items-center ${canRetry ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    <Label
                        text={statusText[syncStatus]}
                        size="small"
                        style="blue"
                        className={
                            syncStatus === 'error'
                                ? '!bg-red/10 !text-red dark:!bg-red/20 dark:!text-red'
                                : undefined
                        }
                    />
                </button>
            }
            side="bottom"
        >
            {canRetry ? `${title} Click to retry.` : title}
        </Tooltip>
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
        <OSButton
            size="md"
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
