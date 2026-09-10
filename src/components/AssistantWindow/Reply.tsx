import React, { useState } from 'react'
import OSButton from 'components/OSButton'

export function AssistantReply({
    answering,
    onAnswer,
    onDismiss,
    placeholder = 'Write back. They will not let this drop.',
}: {
    answering: boolean
    onAnswer: (text: string) => void
    onDismiss?: () => void
    placeholder?: string
}) {
    const [draft, setDraft] = useState('')
    return (
        <div className="space-y-2">
            <textarea
                data-writing-surface
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder={placeholder}
                className="w-full resize-none rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-input"
            />
            <div className="flex items-center gap-2">
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
                    {answering ? '…' : 'Answer'}
                </OSButton>
                {onDismiss ? (
                    <OSButton size="sm" hover="background" onClick={onDismiss}>
                        Dismiss
                    </OSButton>
                ) : null}
            </div>
        </div>
    )
}
