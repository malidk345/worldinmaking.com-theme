import clsx from 'clsx'
import { KeyboardEvent, useMemo, useState } from 'react'

import { IconTrash } from '@posthog/icons'
import { LemonButton, LemonTextArea } from '@posthog/lemon-ui'

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
import { NotebookBlockNode, NotebookComponentBlockNode, NotebookMode } from './types'

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
    const autoFocus = mode === 'edit' && wasNotebookNodeJustInserted(node.id)

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
                'MarkdownNotebook__component-shell',
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
                                    <div className="MarkdownNotebook__discussion-comment-reply-text">{reply.text}</div>
                                </div>
                                {mode === 'edit' ? (
                                    <LemonButton
                                        size="xsmall"
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
                    <div className="MarkdownNotebook__discussion-comment-composer">
                        <LemonTextArea
                            value={draft}
                            onChange={setDraft}
                            placeholder="Write a comment…"
                            minRows={2}
                            autoFocus={autoFocus}
                            data-attr="notebook-discussion-comment-input"
                            className="MarkdownNotebook__discussion-comment-input"
                            onPressCmdEnter={submitReply}
                        />
                        <div className="MarkdownNotebook__discussion-comment-actions">
                            <LemonButton
                                size="xsmall"
                                status="danger"
                                onClick={() => {
                                    if (!deleteSelectedNotebookBlocks()) deleteNode()
                                }}
                            >
                                Delete thread
                            </LemonButton>
                            <LemonButton
                                size="xsmall"
                                type="primary"
                                disabled={!draft.trim()}
                                onClick={submitReply}
                            >
                                Comment
                            </LemonButton>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
