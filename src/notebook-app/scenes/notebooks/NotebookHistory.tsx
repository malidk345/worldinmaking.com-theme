import React, { useEffect, useState } from 'react'
import { LemonButton, LemonTag } from '~nb-lib/lemon-ui/index'
import { IconX } from '@posthog/icons'
import { getNotebookHistory, NotebookVersion } from './notebookStorage'

interface NotebookHistoryProps {
    notebookId: string
    isOpen: boolean
    onClose: () => void
    onRestore: (content: string) => void
}

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}

export function NotebookHistory({ notebookId, isOpen, onClose, onRestore }: NotebookHistoryProps): JSX.Element | null {
    const [history, setHistory] = useState<NotebookVersion[]>([])

    useEffect(() => {
        if (isOpen) {
            setHistory(getNotebookHistory(notebookId))
        }
    }, [notebookId, isOpen])

    if (!isOpen) {
        return null
    }

    return (
        <div
            style={{
                position: 'fixed',
                right: 0,
                top: 0,
                width: '360px',
                height: '100vh',
                background: 'var(--bg-light, #ffffff)',
                borderLeft: '1px solid var(--border)',
                zIndex: 50,
                boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div
                style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <h3 style={{ margin: 0 }}>Version History</h3>
                <LemonButton icon={<IconX />} size="small" onClick={onClose} type="stealth" />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {history.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
                        No history available yet. Changes are saved automatically.
                    </div>
                ) : (
                    history.map((version, index) => {
                        const isCurrent = index === 0;
                        return (
                            <div
                                key={version.version || index}
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    background: 'var(--bg-surface)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <strong>v{version.version || (history.length - index)}</strong>
                                        {isCurrent && <LemonTag type="primary">Current</LemonTag>}
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {timeAgo(version.timestamp)}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        fontSize: '13px',
                                        color: 'var(--text-muted)',
                                        marginBottom: '12px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {version.content.substring(0, 80)}
                                    {version.content.length > 80 ? '...' : ''}
                                </div>
                                {!isCurrent && (
                                    <LemonButton
                                        type="secondary"
                                        size="small"
                                        fullWidth
                                        onClick={() => onRestore(version.content)}
                                    >
                                        Restore this version
                                    </LemonButton>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
