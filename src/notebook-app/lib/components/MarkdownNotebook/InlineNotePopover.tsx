import { LemonTextArea } from '@posthog/lemon-ui'

import { formatNoteTime, noteIntentLabel } from './inlineNotes'

export function InlineNotePopover({
    name,
    avatar,
    text,
    quote,
    createdAt,
    intent,
    suggestion,
    pending,
    draft,
    top,
    left,
    onChangeDraft,
    onSave,
    onClose,
    onDelete,
    onApply,
}: {
    name: string
    avatar?: string
    text: string
    quote?: string
    createdAt?: string
    kind?: 'human' | 'bot'
    intent?: import('./types').NotebookNoteIntent
    suggestion?: string
    pending?: boolean
    draft?: boolean
    top: number
    left: number
    onChangeDraft: (value: string) => void
    onSave: () => void
    onClose: () => void
    onDelete: () => void
    onApply?: () => void
}): JSX.Element {
    const time = formatNoteTime(createdAt)
    const intentLabel = noteIntentLabel(intent)
    const showSuggestion = intent === 'edit' && Boolean(suggestion)
    return (
        <aside
            className="MarkdownNotebook__inline-note-popover"
            style={{ top, left }}
            contentEditable={false}
        >
            <div className="MarkdownNotebook__inline-note-popover-head">
                <span className="MarkdownNotebook__inline-note-popover-who">
                    {avatar ? (
                        <img src={avatar} alt="" className="MarkdownNotebook__inline-note-face" />
                    ) : (
                        <span className="MarkdownNotebook__inline-note-fallback">{name.charAt(0)}</span>
                    )}
                    <span className="MarkdownNotebook__inline-note-popover-meta">
                        <strong>{name}</strong>
                        {intentLabel || time ? <em>{[intentLabel, time].filter(Boolean).join(' · ')}</em> : null}
                    </span>
                </span>
            </div>
            {quote ? <blockquote className="MarkdownNotebook__inline-note-popover-quote">{quote}</blockquote> : null}
            {draft ? (
                <>
                    <LemonTextArea
                        value={text}
                        minRows={2}
                        autoFocus
                        placeholder="Write a compact note…"
                        onChange={onChangeDraft}
                    />
                    <div className="MarkdownNotebook__inline-note-popover-actions">
                        <button type="button" className="MarkdownNotebook__inline-note-popover-action" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="MarkdownNotebook__inline-note-popover-action MarkdownNotebook__inline-note-popover-action--primary"
                            disabled={!text.trim()}
                            onClick={onSave}
                        >
                            Save
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <p className={pending ? 'MarkdownNotebook__inline-note-popover-pending' : undefined}>{text}</p>
                    {showSuggestion ? (
                        <p className="MarkdownNotebook__inline-note-popover-suggestion">{suggestion}</p>
                    ) : null}
                    <div className="MarkdownNotebook__inline-note-popover-actions">
                        <button type="button" className="MarkdownNotebook__inline-note-popover-action" onClick={onClose}>
                            Close
                        </button>
                        {onApply && showSuggestion ? (
                            <button
                                type="button"
                                className="MarkdownNotebook__inline-note-popover-action"
                                onClick={onApply}
                            >
                                Apply
                            </button>
                        ) : null}
                        <button type="button" className="MarkdownNotebook__inline-note-popover-action" onClick={onDelete}>
                            Delete
                        </button>
                    </div>
                </>
            )}
        </aside>
    )
}
