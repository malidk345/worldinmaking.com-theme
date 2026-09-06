import clsx from 'clsx'
import { KeyboardEvent, useMemo, useState } from 'react'

import { IconTrash } from '@posthog/icons'
import OSButton from 'components/OSButton'

import { formatEditedAgo, getNotebookActor } from '../../../../lib/notebook-actor'
import { wasNotebookNodeJustInserted } from './freshlyInserted'
import { uuid } from '../../utils/dom'
import {
    appendDiscussionReply,
    parseDiscussionReplies,
    removeDiscussionReply,
    repliesToPropValue,
} from './discussionComments'
import { InsertMenuSelectionDirection } from './editorTypes'
import {
    filterMentionPeople,
    getMentionTokenAt,
    listMentionPeople,
    type MentionPerson,
    type MentionToken,
} from './mentionPeople'
import { NotebookBlockNode, NotebookComponentBlockNode, NotebookMode } from './types'

function renderCommentText(text: string): JSX.Element {
    const parts = text.split(/(@[^\s@]+)/g)
    return (
        <>
            {parts.map((part, index) =>
                part.startsWith('@') && part.length > 1 ? (
                    <span key={`${part}-${index}`} className="font-semibold text-primary">
                        {part}
                    </span>
                ) : (
                    <span key={`${part}-${index}`}>{part}</span>
                )
            )}
        </>
    )
}

export function DiscussionCommentBlock({
    node,
    mode,
    isSelected,
    setBlockRef,
    updateNode,
    deleteNode,
    deleteSelectedNotebookBlocks,
    insertParagraphAfterNode: _insertParagraphAfterNode,
    moveFocusToAdjacentNode,
}: {
    node: NotebookComponentBlockNode
    mode: NotebookMode
    isSelected: boolean
    setBlockRef: (element: HTMLElement | null) => void
    updateNode: (nodeId: string, updater: (node: NotebookBlockNode) => NotebookBlockNode | null) => void
    deleteNode: () => void
    deleteSelectedNotebookBlocks: () => boolean
    insertParagraphAfterNode: () => void
    moveFocusToAdjacentNode: (nodeId: string, direction: InsertMenuSelectionDirection, offset: number) => boolean
}): JSX.Element {
    void _insertParagraphAfterNode
    const replies = useMemo(() => parseDiscussionReplies(node.props.replies), [node.props.replies])
    const [draft, setDraft] = useState('')
    const [mentionToken, setMentionToken] = useState<MentionToken | null>(null)
    const autoFocus = mode === 'edit' && wasNotebookNodeJustInserted(node.id)
    const mentionPeople = useMemo(
        () => (mentionToken ? filterMentionPeople(listMentionPeople(), mentionToken.query) : []),
        [mentionToken]
    )

    const persistReplies = (next: ReturnType<typeof parseDiscussionReplies>): void => {
        updateNode(node.id, (currentNode) =>
            currentNode.type === 'component'
                ? { ...currentNode, props: { ...currentNode.props, replies: repliesToPropValue(next) } }
                : currentNode
        )
    }

    const submitReply = (): void => {
        const text = draft.trim()
        if (!text || mode !== 'edit') return
        const actor = getNotebookActor()
        const author =
            [actor.first_name, actor.last_name].filter(Boolean).join(' ') || actor.username || actor.email || 'You'
        persistReplies(
            appendDiscussionReply(replies, {
                id: uuid(),
                text,
                author,
                createdAt: new Date().toISOString(),
            })
        )
        setDraft('')
        setMentionToken(null)
    }

    const insertMention = (person: MentionPerson): void => {
        if (!mentionToken) return
        const tokenEnd = mentionToken.start + 1 + mentionToken.query.length
        const next = `${draft.slice(0, mentionToken.start)}@${person.label} ${draft.slice(tokenEnd)}`
        setDraft(next)
        setMentionToken(null)
    }

    const handleDraftChange = (value: string, caret = value.length): void => {
        setDraft(value)
        setMentionToken(getMentionTokenAt(value, caret))
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (mode !== 'edit' || event.target !== event.currentTarget) return

        if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault()
            if (!deleteSelectedNotebookBlocks()) deleteNode()
            return
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (moveFocusToAdjacentNode(node.id, event.key === 'ArrowDown' ? 'next' : 'previous', 0)) {
                event.preventDefault()
            }
        }
    }

    return (
        <div
            className={clsx(
                'MarkdownNotebook__component-shell not-prose',
                isSelected && 'MarkdownNotebook__component-shell--selected'
            )}
            ref={setBlockRef}
            contentEditable={false}
            tabIndex={mode === 'edit' ? 0 : undefined}
            role="complementary"
            aria-label="Comment thread"
            onKeyDown={handleKeyDown}
            data-attr="notebook-discussion-comment"
        >
            <div className="MarkdownNotebook__discussion-comment">
                {replies.length ? (
                    <div className="MarkdownNotebook__discussion-comment-replies">
                        {replies.map((reply) => (
                            <div key={reply.id} className="MarkdownNotebook__discussion-comment-reply">
                                <div className="MarkdownNotebook__discussion-comment-reply-body">
                                    <div className="MarkdownNotebook__discussion-comment-reply-meta">
                                        <span className="MarkdownNotebook__discussion-comment-reply-author">
                                            {reply.author}
                                        </span>
                                        {reply.createdAt ? (
                                            <span className="MarkdownNotebook__discussion-comment-reply-time">
                                                {formatEditedAgo(reply.createdAt)}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div
                                        className={clsx(
                                            'MarkdownNotebook__discussion-comment-reply-text',
                                            reply.pending && 'MarkdownNotebook__discussion-comment-reply-text--pending'
                                        )}
                                    >
                                        {renderCommentText(reply.text)}
                                    </div>
                                </div>
                                {mode === 'edit' ? (
                                    <OSButton
                                        size="xs"
                                        icon={<IconTrash />}
                                        tooltip="Delete reply"
                                        aria-label="Delete reply"
                                        onClick={() => persistReplies(removeDiscussionReply(replies, reply.id))}
                                    />
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="MarkdownNotebook__discussion-comment-empty m-0">No replies yet</p>
                )}

                {mode === 'edit' ? (
                    <div className="MarkdownNotebook__discussion-comment-composer relative">
                        {mentionToken ? (
                            <div
                                className="absolute left-0 right-0 bottom-full mb-1 z-20 border border-primary rounded bg-primary shadow-lg max-h-40 overflow-y-auto"
                                role="listbox"
                                aria-label="Mention"
                            >
                                {mentionPeople.length ? (
                                    mentionPeople.map((person) => (
                                        <button
                                            key={person.id}
                                            type="button"
                                            role="option"
                                            className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent"
                                            onClick={() => insertMention(person)}
                                        >
                                            <span className="size-5 rounded-full overflow-hidden bg-accent flex items-center justify-center text-[10px] shrink-0">
                                                {person.avatar ? (
                                                    <img src={person.avatar} alt="" className="size-5 object-cover" />
                                                ) : (
                                                    person.label.charAt(0)
                                                )}
                                            </span>
                                            <span className="truncate">@{person.label}</span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="m-0 px-2 py-2 text-xs text-muted">No match</p>
                                )}
                            </div>
                        ) : null}
                        <textarea
                            value={draft}
                            onChange={(event) =>
                                handleDraftChange(event.target.value, event.target.selectionStart ?? event.target.value.length)
                            }
                            onKeyUp={(event) =>
                                setMentionToken(
                                    getMentionTokenAt(
                                        event.currentTarget.value,
                                        event.currentTarget.selectionStart ?? event.currentTarget.value.length
                                    )
                                )
                            }
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                    event.preventDefault()
                                    submitReply()
                                }
                                if (event.key === 'Escape' && mentionToken) {
                                    event.preventDefault()
                                    setMentionToken(null)
                                }
                            }}
                            placeholder="Write a comment… @ to mention"
                            rows={2}
                            autoFocus={autoFocus}
                            data-attr="notebook-discussion-comment-input"
                            className="w-full rounded border border-primary bg-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted resize-y min-h-[3.5rem]"
                        />
                        <div className="MarkdownNotebook__discussion-comment-actions flex items-center justify-end gap-1 mt-1">
                            <OSButton
                                size="xs"
                                onClick={() => {
                                    if (!deleteSelectedNotebookBlocks()) deleteNode()
                                }}
                            >
                                <span className="text-red">Delete thread</span>
                            </OSButton>
                            <OSButton
                                variant="primary"
                                size="xs"
                                disabled={!draft.trim()}
                                onClick={submitReply}
                            >
                                Comment
                            </OSButton>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
