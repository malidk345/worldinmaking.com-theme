import clsx from 'clsx'
import { KeyboardEvent, MutableRefObject, useCallback, useEffect, useRef } from 'react'

import { IconArrowRight, IconX } from '@posthog/icons'
import { LemonButton } from '@posthog/lemon-ui'

import { getNotebookStringProp, isPromptComponentNode } from './documentModel'
import { RestoreSelectionRequest } from './editorTypes'
import { NotebookBlockNode, NotebookComponentBlockNode, NotebookMode } from './types'

export function EditablePromptComponent({
    node,
    mode,
    setBlockRef,
    updateNode,
    deleteNodeAndFocusAdjacent,
    updateAIPromptQuery,
    submitAIPrompt,
    isAIPromptSubmitDisabled,
    isActive,
    focusRequest,
    restoreSelectionRef,
}: {
    node: NotebookComponentBlockNode
    mode: NotebookMode
    setBlockRef: (element: HTMLElement | null) => void
    updateNode: (nodeId: string, updater: (node: NotebookBlockNode) => NotebookBlockNode | null) => void
    deleteNodeAndFocusAdjacent: () => void
    updateAIPromptQuery: (query: string) => void
    submitAIPrompt: (queryOverride?: string) => boolean
    isAIPromptSubmitDisabled: boolean
    isActive: boolean
    focusRequest?: number
    restoreSelectionRef: MutableRefObject<RestoreSelectionRequest | null>
}): JSX.Element {
    const elementRef = useRef<HTMLTextAreaElement | null>(null)
    const autoRanRef = useRef(false)
    const question = getNotebookStringProp(node.props.question) ?? ''
    const selectedMarkdown = (getNotebookStringProp(node.props.selectedMarkdown) ?? '').trim()
    const autoRun = node.props.autoRun === true

    const setElementRef = useCallback(
        (element: HTMLTextAreaElement | null): void => {
            elementRef.current = element
            setBlockRef(element)
        },
        [setBlockRef]
    )

    useEffect(() => {
        const element = elementRef.current
        if (!isActive || !element || document.activeElement === element || autoRun) {
            return
        }
        element.focus()
        element.setSelectionRange(question.length, question.length)
    }, [isActive, question.length, autoRun])

    useEffect(() => {
        if (focusRequest === undefined || autoRun) {
            return
        }
        const element = elementRef.current
        if (!element) {
            return
        }
        element.focus()
        element.setSelectionRange(question.length, question.length)
    }, [focusRequest, autoRun, question.length])

    useEffect(() => {
        if (!autoRun || autoRanRef.current || !question.trim() || isAIPromptSubmitDisabled || mode !== 'edit') {
            return
        }
        autoRanRef.current = true
        submitAIPrompt(question)
    }, [autoRun, isAIPromptSubmitDisabled, mode, question, submitAIPrompt])

    const updateQuestion = (nextQuestion: string): void => {
        updateNode(node.id, (currentNode) => {
            if (!isPromptComponentNode(currentNode)) {
                return currentNode
            }
            return {
                ...currentNode,
                props: {
                    ...currentNode.props,
                    question: nextQuestion,
                },
            }
        })
        updateAIPromptQuery(nextQuestion)
    }

    const handleRunPrompt = (queryToRun: string = question): void => {
        if (!queryToRun.trim() || isAIPromptSubmitDisabled) {
            return
        }
        submitAIPrompt(queryToRun)
    }

    const deletePrompt = (): void => {
        deleteNodeAndFocusAdjacent()
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
        event.stopPropagation()

        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            handleRunPrompt(event.currentTarget.value)
            return
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            deletePrompt()
            return
        }

        if (event.key === 'Backspace' && question.length === 0) {
            event.preventDefault()
            deletePrompt()
        }
    }

    void restoreSelectionRef

    if (autoRun) {
        return (
            <div className="MarkdownNotebook__text-row MarkdownNotebook__text-row--ai-prompt">
                <div className="WimInlineEditor WimInlineEditor--busy" contentEditable={false} data-markdown-notebook-node-id={node.id}>
                    <div className="WimInlineEditor__bar">
                        <span className="WimInlineEditor__mark">WIM AI</span>
                    </div>
                    <p className="WimInlineEditor__status">Writing…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="MarkdownNotebook__text-row MarkdownNotebook__text-row--ai-prompt">
            <div
                className={clsx('WimInlineEditor', isAIPromptSubmitDisabled && 'WimInlineEditor--busy')}
                contentEditable={false}
                data-markdown-notebook-node-id={node.id}
            >
                <div className="WimInlineEditor__bar">
                    <span className="WimInlineEditor__mark">WIM AI</span>
                    <LemonButton
                        size="xsmall"
                        type="tertiary"
                        icon={<IconX />}
                        tooltip="Dismiss"
                        aria-label="Dismiss editor"
                        onClick={deletePrompt}
                        disabled={mode !== 'edit'}
                    />
                </div>

                {selectedMarkdown ? (
                    <p className="WimInlineEditor__target">{selectedMarkdown}</p>
                ) : null}

                <textarea
                    ref={setElementRef}
                    value={question}
                    onChange={(event) => {
                        event.stopPropagation()
                        updateQuestion(event.currentTarget.value)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedMarkdown ? 'What should change?' : 'What should be written?'}
                    rows={2}
                    className="WimInlineEditor__input"
                    disabled={mode !== 'edit' || isAIPromptSubmitDisabled}
                />

                <div className="WimInlineEditor__actions">
                    <span className="WimInlineEditor__hint">⌘↵</span>
                    <LemonButton
                        type="primary"
                        size="small"
                        icon={<IconArrowRight />}
                        onClick={() => handleRunPrompt()}
                        loading={isAIPromptSubmitDisabled}
                        disabled={!question.trim() || isAIPromptSubmitDisabled || mode !== 'edit'}
                        tooltip="Apply instruction"
                    >
                        Apply
                    </LemonButton>
                </div>
            </div>
        </div>
    )
}
