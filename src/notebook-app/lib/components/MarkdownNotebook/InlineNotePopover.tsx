import { IconCheck, IconTrash, IconX } from '@posthog/icons'
import OSButton from 'components/OSButton'

import { formatNoteTime } from './inlineNotes'

export function InlineNotePopover({
    name,
    avatar,
    text,
    createdAt,
    intent,
    scope,
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
                    <textarea
                        value={text}
                        rows={3}
                        autoFocus
                        placeholder="Write a compact note…"
                        onChange={(event) => onChangeDraft(event.target.value)}
                        className="notebook-native-field w-full rounded-sm border border-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted"
                    />
                    <div className="MarkdownNotebook__inline-note-popover-actions">
                        <OSButton size="xs" icon={<IconX />} tooltip="Cancel" onClick={onClose} />
                        <OSButton
                            size="xs"
                            variant="primary"
                            icon={<IconCheck />}
                            tooltip="Save"
                            disabled={!text.trim()}
                            onClick={onSave}
                        />
                    </div>
                </>
            ) : (
                <>
                    <p className={pending ? 'MarkdownNotebook__inline-note-popover-pending' : undefined}>{text}</p>
                    {showSuggestion ? (
                        <p className="MarkdownNotebook__inline-note-popover-suggestion">{suggestion}</p>
                    ) : null}
                    <div className="MarkdownNotebook__inline-note-popover-actions">
                        <OSButton size="xs" icon={<IconX />} tooltip="Close" onClick={onClose} />
                        {onApply && showSuggestion ? (
                            <OSButton size="xs" icon={<IconCheck />} tooltip="Apply" onClick={onApply} />
                        ) : null}
                        {onToggleResolved ? (
                            <OSButton size="xs" onClick={onToggleResolved}>
                                {resolved ? 'Reopen' : 'Resolve'}
                            </OSButton>
                        ) : null}
                        <OSButton size="xs" icon={<IconTrash />} tooltip="Delete" onClick={onDelete} />
                    </div>
                </>
            )}
        </aside>
    )
}
