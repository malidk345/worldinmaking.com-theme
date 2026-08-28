import React, { useState } from 'react'
import { LemonButton, LemonTag } from '~nb-lib/lemon-ui/index'
import { IconSparkles, IconCheck, IconPlus, IconExternal } from '@posthog/icons'
import { useApp } from '../../../context/App'
import { createNotebook } from './notebookStorage'

export interface OSActionCardData {
    type: 'create_notebook' | 'create_forum_topic' | 'open_window' | 'insert_notebook_block'
    title: string
    description: string
    payload: {
        title?: string
        content?: string
        path?: string
        notebookId?: string
    }
    executed?: boolean
}

export interface OSActionCardViewProps {
    action: OSActionCardData
    onActionCompleted?: () => void
}

export function OSActionCardView({ action, onActionCompleted }: OSActionCardViewProps): JSX.Element {
    const app = useApp()
    const [isExecuting, setIsExecuting] = useState(false)
    const [isDone, setIsDone] = useState(!!action.executed)

    const handleExecute = async () => {
        if (isDone || isExecuting) return
        setIsExecuting(true)
        try {
            if (action.type === 'create_notebook') {
                const title = action.payload.title || 'Untitled AI Notebook'
                const content = action.payload.content || ''
                createNotebook(title, content)
                app?.openWindow?.('notebooks')
            } else if (action.type === 'create_forum_topic') {
                app?.openWindow?.('community')
            } else if (action.type === 'open_window') {
                const winId = action.payload.path || 'home'
                app?.openWindow?.(winId)
            } else if (action.type === 'insert_notebook_block') {
                window.dispatchEvent(
                    new CustomEvent('wimNotebookInsertText', {
                        detail: {
                            text: action.payload.content || '',
                            mode: 'append',
                            notebookId: action.payload.notebookId,
                        },
                    })
                )
                app?.openWindow?.('notebooks')
            }
            setIsDone(true)
            action.executed = true
            onActionCompleted?.()
        } catch (err) {
            console.error('Failed to execute OS Action:', err)
        } finally {
            setIsExecuting(false)
        }
    }

    return (
        <div className="my-2.5 p-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-bg-light/80 to-accent-light/40 dark:from-primary/10 dark:via-dark/80 dark:to-accent-dark/40 shadow-sm backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
                        <IconSparkles className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-primary truncate">{action.title}</span>
                            <LemonTag type={isDone ? 'success' : 'highlight'} className="text-[10px] uppercase tracking-wider py-0 px-1.5">
                                {isDone ? 'Executed' : 'Suggested Action'}
                            </LemonTag>
                        </div>
                        <p className="text-xs text-muted mt-0.5 leading-relaxed truncate">{action.description}</p>
                    </div>
                </div>

                <div className="shrink-0">
                    <LemonButton
                        type={isDone ? 'secondary' : 'primary'}
                        size="small"
                        icon={isDone ? <IconCheck /> : <IconPlus />}
                        loading={isExecuting}
                        disabled={isDone}
                        onClick={handleExecute}
                        className="font-medium text-xs shadow-sm"
                    >
                        {isDone ? 'Completed' : 'Execute'}
                    </LemonButton>
                </div>
            </div>
        </div>
    )
}
