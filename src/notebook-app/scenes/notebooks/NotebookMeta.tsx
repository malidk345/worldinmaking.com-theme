import React from 'react'
import { IconExpand } from '@posthog/icons'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'

export type NotebookChromeSyncStatus = 'saved' | 'edited' | 'local' | 'error' | 'offline'

const NAVY = '#1D4ED8'
const NAVY_FILL = 'rgba(29, 78, 216, 0.1)'

const tagBox: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    border: `1px solid ${NAVY}`,
    borderRadius: 4,
    background: NAVY_FILL,
    color: NAVY,
    fontWeight: 400,
    lineHeight: 1,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
}

const syncTagStyle: React.CSSProperties = { ...tagBox, fontSize: 14 }
const compactTagStyle: React.CSSProperties = { ...tagBox, fontSize: 12 }
const errorTagStyle: React.CSSProperties = {
    ...syncTagStyle,
    border: '1px solid #dc2626',
    background: 'rgba(220, 38, 38, 0.1)',
    color: '#dc2626',
}

export function NotebookTag({
    children,
    className = '',
    onClick,
}: {
    children: React.ReactNode
    className?: string
    onClick?: (event: React.MouseEvent) => void
}): JSX.Element {
    return (
        <span
            role={onClick ? 'button' : undefined}
            onClick={onClick}
            className={`shrink-0 ${className}`}
            style={compactTagStyle}
        >
            {children}
        </span>
    )
}

export interface NotebookSyncInfoProps {
    syncStatus: NotebookChromeSyncStatus
    message?: string
    onRetry?: () => void
}

export function NotebookSyncInfo({ syncStatus, message, onRetry }: NotebookSyncInfoProps): JSX.Element {
    const statusText: Record<NotebookChromeSyncStatus, string> = {
        saved: 'Saved',
        edited: 'Syncing',
        local: 'Local',
        error: 'Sync failed',
        offline: 'Offline',
    }

    const title =
        message ||
        (syncStatus === 'saved'
            ? 'Saved on this device. Cloud sync is up to date.'
            : syncStatus === 'edited'
              ? 'Syncing…'
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
                    <span
                        style={
                            syncStatus === 'error' || syncStatus === 'offline' ? errorTagStyle : syncTagStyle
                        }
                    >
                        {statusText[syncStatus]}
                    </span>
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
