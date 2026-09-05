import React from 'react'
import { LemonTag } from '~nb-lib/lemon-ui/index'
import OSButton from 'components/OSButton'
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
    /** @deprecated prefer variant; kept for callers using Lemon names */
    type?: 'primary' | 'secondary' | 'stealth'
    variant?: 'default' | 'primary' | 'secondary'
    size?: 'small' | 'medium' | 'xs' | 'sm' | 'md'
}

export function NotebookExpandButton({
    isExpanded,
    onToggleExpand,
    type = 'secondary',
    variant,
    size = 'small',
}: NotebookExpandButtonProps): JSX.Element {
    const sizeMap = { small: 'sm', medium: 'md', xsmall: 'xs', xs: 'xs', sm: 'sm', md: 'md' } as const
    const variantMap = { primary: 'primary', secondary: 'secondary', stealth: 'default', tertiary: 'default' } as const
    const osSize = sizeMap[size as keyof typeof sizeMap] ?? 'sm'
    const osVariant = variant ?? variantMap[type as keyof typeof variantMap] ?? 'secondary'
    return (
        <OSButton
                    hover="background"
                    zoomHover={false}
            size={osSize}
            variant={osVariant}
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
