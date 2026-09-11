import React, { useState } from 'react'
import OSButton from 'components/OSButton'

export function AssistantReply({
    answering,
    onAnswer,
    onDismiss,
    extra,
    placeholder = 'Reply…',
    submitLabel = 'Reply',
    rows = 4,
}: {
    answering: boolean
    onAnswer: (text: string) => void
    onDismiss?: () => void
    extra?: React.ReactNode
    placeholder?: string
    submitLabel?: string
    rows?: number
}) {
    const [draft, setDraft] = useState('')
    return (
        <div className="space-y-2">
            <textarea
                id="assistant-reply-box"
                data-writing-surface
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={rows}
                placeholder={placeholder}
                className="w-full resize-none rounded border border-primary bg-primary px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-input leading-relaxed"
            />
            <div className="flex items-center gap-2 flex-wrap">
                <OSButton
                    size="sm"
                    variant="primary"
                    disabled={answering || !draft.trim()}
                    onClick={() => {
                        const text = draft.trim()
                        if (!text) return
                        onAnswer(text)
                        setDraft('')
                    }}
                >
                    {answering ? '…' : submitLabel}
                </OSButton>
                {onDismiss ? (
                    <OSButton size="sm" hover="background" onClick={onDismiss}>
                        Dismiss
                    </OSButton>
                ) : null}
                {extra}
            </div>
        </div>
    )
}
