import { IconCheck, IconTrash, IconX } from '@posthog/icons'
import { LemonTextArea } from '@posthog/lemon-ui'

import { formatNoteTime } from './inlineNotes'

export function InlineNotePopover({
    name,
    avatar,
    text,
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
    onToggleResolved,
    resolved,
}: {
    name: string
    avatar?: string
    text: string
    createdAt?: string
    kind?: 'human' | 'bot'
    intent?: import('./types').NotebookNoteIntent
    scope?: 'span' | 'piece' | 'block'
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
    onToggleResolved?: () => void
    resolved?: boolean
}): JSX.Element {
    const time = formatNoteTime(createdAt)
    const showSuggestion = intent === 'edit' && Boolean(suggestion)
    return (
        <aside
            className="MarkdownNotebook__inline-note-popover MarkdownNotebook__inline-note-popover--fixed"
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
                        {time ? <em>{time}</em> : null}
                    </span>
                </span>
            </div>
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
                        <button
                            type="button"
                            className="MarkdownNotebook__inline-note-popover-action MarkdownNotebook__inline-note-popover-action--icon"
                            aria-label="Cancel"
                            onClick={onClose}
                        >
                            <IconX />
                        </button>
                        <button
                            type="button"
                            className="MarkdownNotebook__inline-note-popover-action MarkdownNotebook__inline-note-popover-action--icon MarkdownNotebook__inline-note-popover-action--primary"
                            disabled={!text.trim()}
                            aria-label="Save"
                            onClick={onSave}
                        >
                            <IconCheck />
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
                        <button
                            type="button"
                            className="MarkdownNotebook__inline-note-popover-action MarkdownNotebook__inline-note-popover-action--icon"
                            aria-label="Close"
                            onClick={onClose}
                        >
                            <IconX />
                        </button>
                        {onApply && showSuggestion ? (
                            <button
                                type="button"
                                className="MarkdownNotebook__inline-note-popover-action MarkdownNotebook__inline-note-popover-action--icon"
                                aria-label="Apply"
                                onClick={onApply}
                            >
                                <IconCheck />
                            </button>
                        ) : null}
                        {onToggleResolved ? (
                            <button
                                type="button"
                                className="MarkdownNotebook__inline-note-popover-action"
                                aria-label={resolved ? 'Reopen' : 'Resolve'}
                                onClick={onToggleResolved}
                            >
                                {resolved ? 'Reopen' : 'Resolve'}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="MarkdownNotebook__inline-note-popover-action MarkdownNotebook__inline-note-popover-action--icon"
                            aria-label="Delete"
                            onClick={onDelete}
                        >
                            <IconTrash />
                        </button>
                    </div>
                </>
            )}
        </aside>
    )
}
