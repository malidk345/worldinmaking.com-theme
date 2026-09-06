import clsx from 'clsx'
import { KeyboardEvent, useState } from 'react'

import { IconComment } from '@posthog/icons'
import { Popover } from 'components/RadixUI/Popover'

import { InsertMenuSelectionDirection } from './editorTypes'
import { wasNotebookNodeJustInserted } from './freshlyInserted'
import { NotebookBlockNode, NotebookComponentBlockNode, NotebookMode } from './types'

/**
 * A markdown comment (`<!-- … -->`) rendered as a small info chip. The markdown carries
 * only the comment text — no ids, no markup noise — and the chip opens a dropdown with a
 * plain text editor.
 */
export function CommentBlock({
    node,
    mode,
    isSelected,
    setBlockRef,
    updateNode,
    deleteNode,
    deleteSelectedNotebookBlocks,
    insertParagraphAfterNode,
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
    const text = typeof node.props.text === 'string' ? node.props.text : ''
    // Freshly inserted comments open the editor right away so typing can start immediately —
    // but only when this user just inserted it, never when an empty comment merely mounts
    // (loading a notebook, a remote merge) where it would steal focus.
    const [isEditorOpen, setIsEditorOpen] = useState(
        () => mode === 'edit' && !text && wasNotebookNodeJustInserted(node.id)
    )

    const setText = (value: string): void => {
        updateNode(node.id, (currentNode) =>
            currentNode.type === 'component'
                ? { ...currentNode, props: { ...currentNode.props, text: value } }
                : currentNode
        )
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (mode !== 'edit' || event.target !== event.currentTarget) {
            return
        }

        if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault()
            if (!deleteSelectedNotebookBlocks()) {
                deleteNode()
            }
            return
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (moveFocusToAdjacentNode(node.id, event.key === 'ArrowDown' ? 'next' : 'previous', 0)) {
                event.preventDefault()
            }
            return
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            if (event.metaKey || event.ctrlKey) {
                insertParagraphAfterNode()
            } else {
                setIsEditorOpen(true)
            }
        }
    }

    return (
        <div
            className={clsx(
                'MarkdownNotebook__comment-block',
                isSelected && 'MarkdownNotebook__comment-block--selected'
            )}
            ref={setBlockRef}
            contentEditable={false}
            tabIndex={mode === 'edit' ? 0 : undefined}
            role="note"
            aria-label="Comment"
            onKeyDown={handleKeyDown}
            data-attr="notebook-comment-block"
        >
            <Popover
                dataScheme="primary"
                open={isEditorOpen}
                onOpenChange={(visible) => setIsEditorOpen(visible && mode === 'edit')}
                side="bottom"
                align="start"
                scrollable={false}
                trigger={
                    <button type="button" className="MarkdownNotebook__comment-chip" title={text || 'Comment'}>
                        <IconComment />
                        <span className="MarkdownNotebook__comment-chip-text">{text || 'Comment'}</span>
                    </button>
                }
            >
                <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Write a comment…"
                    rows={3}
                    autoFocus
                    data-attr="notebook-comment-editor"
                    className="notebook-native-field w-[min(20rem,80vw)] rounded-sm border border-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted"
                />
            </Popover>
        </div>
    )
}
