import clsx from 'clsx'
import { KeyboardEvent, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'

import { IconPlus, IconArrowUp, IconCheck, IconX } from '@posthog/icons'

import { getNotebookStringProp, isPromptComponentNode } from './documentModel'
import { RestoreSelectionRequest } from './editorTypes'
import { NotebookBlockNode, NotebookComponentBlockNode, NotebookMode } from './types'

const PRESET_PILLS = [
    { label: 'İyileştir', prompt: 'Metnin anlatımını iyileştir ve akıcı hale getir' },
    { label: 'Kısalt', prompt: 'Metni özünü bozmadan daha kısa ve öz yaz' },
    { label: 'Özetle', prompt: 'Temel noktaları 3 maddede özetle' },
    { label: 'İmla Düzelt', prompt: 'Yazım ve dilbilgisi hatalarını düzelt' },
]

export function EditablePromptComponent({
    node,
    mode,
    setBlockRef,
    updateNode,
    deleteNodeAndFocusAdjacent,
    acceptAISelection,
    rejectAISelection,
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
    acceptAISelection: () => void
    rejectAISelection: () => void
    updateAIPromptQuery: (query: string) => void
    submitAIPrompt: (queryOverride?: string) => boolean
    isAIPromptSubmitDisabled: boolean
    isActive: boolean
    focusRequest?: number
    restoreSelectionRef: MutableRefObject<RestoreSelectionRequest | null>
}): JSX.Element {
    const elementRef = useRef<HTMLInputElement | null>(null)
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const autoRanRef = useRef(false)
    const wasBusyRef = useRef(false)
    const [isFlipped, setIsFlipped] = useState(false)
    const [showPresets, setShowPresets] = useState(false)
    const [selectionX, setSelectionX] = useState<number | null>(null)
    const [isReviewing, setIsReviewing] = useState(false)
    const question = getNotebookStringProp(node.props.question) ?? ''
    const selectedMarkdown = (getNotebookStringProp(node.props.selectedMarkdown) ?? '').trim()
    const autoRun = node.props.autoRun === true

    const setElementRef = useCallback(
        (element: HTMLInputElement | null): void => {
            elementRef.current = element
            setBlockRef(element)
        },
        [setBlockRef]
    )

    // Detect when AI finish writing to switch to Accept/Reject review mode
    useEffect(() => {
        if (isAIPromptSubmitDisabled) {
            wasBusyRef.current = true
        } else if (wasBusyRef.current) {
            wasBusyRef.current = false
            setIsReviewing(true)
        }
    }, [isAIPromptSubmitDisabled])

    // Calculate exact X coordinate of current text selection/cursor relative to container
    useEffect(() => {
        if (!wrapperRef.current) return
        const wrapperRect = wrapperRef.current.getBoundingClientRect()
        setIsFlipped(wrapperRect.top < 65)

        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0)
            const rangeRect = range.getBoundingClientRect()
            if (rangeRect.width > 0 || rangeRect.left > 0) {
                const centerX = (rangeRect.left + rangeRect.width / 2) - wrapperRect.left
                // Clamp X within the wrapper bounds
                const clampedX = Math.max(160, Math.min(wrapperRect.width - 160, centerX))
                setSelectionX(clampedX)
                return
            }
        }
        setSelectionX(null)
    }, [isActive])

    useEffect(() => {
        const element = elementRef.current
        if (!isActive || !element || document.activeElement === element || autoRun || isReviewing) {
            return
        }
        element.focus()
        element.setSelectionRange(question.length, question.length)
    }, [isActive, question.length, autoRun, isReviewing])

    useEffect(() => {
        if (focusRequest === undefined || autoRun || isReviewing) {
            return
        }
        const element = elementRef.current
        if (!element) {
            return
        }
        element.focus()
        element.setSelectionRange(question.length, question.length)
    }, [focusRequest, autoRun, question.length, isReviewing])

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

    const handleAccept = (): void => {
        acceptAISelection()
    }

    const handleReject = (): void => {
        rejectAISelection()
    }

    const deletePrompt = (): void => {
        deleteNodeAndFocusAdjacent()
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
        event.stopPropagation()

        if (event.key === 'Enter') {
            event.preventDefault()
            handleRunPrompt(event.currentTarget.value)
            return
        }

        if (event.key === 'ArrowUp' && !question.trim()) {
            const draft = typeof window !== 'undefined' ? localStorage.getItem('wim_ai_draft_prompt') : null
            if (draft) {
                event.preventDefault()
                updateQuestion(draft)
                return
            }
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            if (question.trim() && typeof window !== 'undefined') {
                localStorage.setItem('wim_ai_draft_prompt', question.trim())
            }
            deletePrompt()
            return
        }

        if (event.key === 'Backspace' && question.length === 0) {
            event.preventDefault()
            deletePrompt()
        }
    }

    void restoreSelectionRef

    if ((autoRun || isAIPromptSubmitDisabled) && !isReviewing) {
        return (
            <div className="MarkdownNotebook__text-row MarkdownNotebook__text-row--ai-prompt">
                <div className="WimInlinePill WimInlinePill--busy" contentEditable={false} data-markdown-notebook-node-id={node.id}>
                    <span className="WimInlinePill__spinner" />
                    <span className="WimInlinePill__writingText">WIM AI writing…</span>
                </div>
            </div>
        )
    }

    // Review Mode: After AI generates text, show ONLY Accept (✓) and Reject (✕) icons
    if (isReviewing) {
        return (
            <div ref={wrapperRef} className="MarkdownNotebook__text-row MarkdownNotebook__text-row--ai-prompt">
                <div
                    className={clsx('WimInlinePill', 'WimInlinePill--review', isFlipped && 'WimInlinePill--flipped')}
                    style={{
                        left: selectionX !== null ? `${selectionX}px` : '50%',
                        transform: 'translateX(-50%)',
                    }}
                    contentEditable={false}
                    data-markdown-notebook-node-id={node.id}
                >
                    {/* Accept (✓) Icon Button */}
                    <button
                        type="button"
                        className="WimInlinePill__acceptBtn"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleAccept}
                        title="Accept AI changes (✓)"
                    >
                        <IconCheck className="size-3.5 stroke-[2.5]" />
                    </button>

                    {/* Reject (✕) Icon Button */}
                    <button
                        type="button"
                        className="WimInlinePill__rejectBtn"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleReject}
                        title="Reject AI changes (✕)"
                    >
                        <IconX className="size-3.5 stroke-[2.5]" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div ref={wrapperRef} className="MarkdownNotebook__text-row MarkdownNotebook__text-row--ai-prompt">
            <div
                className={clsx(
                    'WimInlinePill',
                    isFlipped && 'WimInlinePill--flipped',
                    isAIPromptSubmitDisabled && 'WimInlinePill--busy'
                )}
                style={{
                    left: selectionX !== null ? `${selectionX}px` : '50%',
                    transform: 'translateX(-50%)',
                }}
                contentEditable={false}
                data-markdown-notebook-node-id={node.id}
            >
                {/* Left (+) Plus Circle Button */}
                <button
                    type="button"
                    className="WimInlinePill__plusBtn"
                    onClick={() => setShowPresets(!showPresets)}
                    title="Quick actions"
                >
                    <IconPlus className="size-3 text-[#999999]" />
                </button>

                {/* Selection Context Badge */}
                {selectedMarkdown && (
                    <span className="WimInlinePill__selectedTag" title={selectedMarkdown}>
                        "{selectedMarkdown.slice(0, 16)}{selectedMarkdown.length > 16 ? '…' : ''}"
                    </span>
                )}

                {/* Main Prompt Input */}
                <input
                    type="text"
                    ref={setElementRef}
                    value={question}
                    onChange={(event) => {
                        event.stopPropagation()
                        updateQuestion(event.currentTarget.value)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedMarkdown ? 'Tell WIM AI what to change' : 'Tell WIM AI what to write'}
                    className="WimInlinePill__input"
                    disabled={mode !== 'edit' || isAIPromptSubmitDisabled}
                />

                {/* Right Upward Arrow Submit Button */}
                <button
                    type="button"
                    className={clsx(
                        'WimInlinePill__submitBtn',
                        question.trim() ? 'WimInlinePill__submitBtn--active' : 'WimInlinePill__submitBtn--disabled'
                    )}
                    onClick={() => handleRunPrompt()}
                    disabled={!question.trim() || isAIPromptSubmitDisabled || mode !== 'edit'}
                    title="Submit (Enter)"
                >
                    <IconArrowUp className="size-3.5 stroke-[2.5]" />
                </button>
            </div>

            {/* Presets Popup Menu when (+) is clicked */}
            {showPresets && !question.trim() && (
                <div className={clsx('WimInlinePill__presets', isFlipped ? 'WimInlinePill__presets--top' : 'WimInlinePill__presets--bottom')}>
                    {PRESET_PILLS.map((pill) => (
                        <button
                            key={pill.label}
                            type="button"
                            className="WimInlinePill__presetItem"
                            onClick={() => {
                                updateQuestion(pill.prompt)
                                handleRunPrompt(pill.prompt)
                                setShowPresets(false)
                            }}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}





