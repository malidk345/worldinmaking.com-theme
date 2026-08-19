import clsx from 'clsx'
import { KeyboardEvent, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'

import {
    IconPlus,
    IconArrowUp,
    IconCheck,
    IconX,
    IconSparkles,
    IconBolt,
    IconPencil,
    IconList,
    IconQuote,
    IconRefresh,
} from '@posthog/icons'

import { getNotebookStringProp, isPromptComponentNode } from './documentModel'
import { RestoreSelectionRequest } from './editorTypes'
import { NotebookBlockNode, NotebookComponentBlockNode, NotebookMode } from './types'

const PRESET_ACTIONS = [
    {
        id: 'improve',
        label: 'Improve',
        Icon: IconSparkles,
        prompt: 'Improve clarity, tone, and flow while preserving the core thesis',
    },
    {
        id: 'counter',
        label: 'Counter-thesis',
        Icon: IconBolt,
        prompt: 'Challenge this premise with a rigorous Socratic counter-argument',
    },
    {
        id: 'shorten',
        label: 'Shorten',
        Icon: IconPencil,
        prompt: 'Make concise and direct without losing philosophical nuance',
    },
    {
        id: 'summarize',
        label: 'Key points',
        Icon: IconList,
        prompt: 'Distill the core concepts into structured key takeaways',
    },
    {
        id: 'aphorism',
        label: 'Aphorism',
        Icon: IconQuote,
        prompt: 'Transform this idea into a memorable philosophical aphorism',
    },
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
    const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(-1)
    const [isReviewing, setIsReviewing] = useState(false)
    const question = getNotebookStringProp(node.props.question) ?? ''
    const selectedMarkdown = (getNotebookStringProp(node.props.selectedMarkdown) ?? '').trim()
    const error = (getNotebookStringProp(node.props.error) ?? '').trim()
    const autoRun = node.props.autoRun === true

    const setElementRef = useCallback(
        (element: HTMLInputElement | null): void => {
            elementRef.current = element
            setBlockRef(element)
        },
        [setBlockRef]
    )

    // Detect when AI finishes writing to switch to Accept/Reject review mode.
    useEffect(() => {
        if (isAIPromptSubmitDisabled) {
            wasBusyRef.current = true
            return
        }
        if (wasBusyRef.current) {
            wasBusyRef.current = false
            if (!error) setIsReviewing(true)
        }
    }, [error, isAIPromptSubmitDisabled])

    useEffect(() => {
        if (!wrapperRef.current) return
        setIsFlipped(wrapperRef.current.getBoundingClientRect().top < 65)
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

    // Keyboard listener in review mode (Tab = Accept, Esc = Reject)
    useEffect(() => {
        if (!isReviewing || mode !== 'edit') return

        const handleReviewKeyDown = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault()
                acceptAISelection()
            } else if (e.key === 'Escape') {
                e.preventDefault()
                rejectAISelection()
            }
        }

        window.addEventListener('keydown', handleReviewKeyDown)
        return () => window.removeEventListener('keydown', handleReviewKeyDown)
    }, [isReviewing, mode, acceptAISelection, rejectAISelection])

    // Click outside listener: auto-dismisses empty prompts, auto-accepts review on focus change
    useEffect(() => {
        if (mode !== 'edit' || isAIPromptSubmitDisabled) return

        const handleDocumentClick = (e: MouseEvent) => {
            if (!wrapperRef.current) return
            const target = e.target as Node | null
            if (target && !wrapperRef.current.contains(target)) {
                if (isReviewing) {
                    acceptAISelection()
                    return
                }
                if (!question.trim() || error) {
                    deletePrompt()
                }
            }
        }

        document.addEventListener('mousedown', handleDocumentClick)
        return () => document.removeEventListener('mousedown', handleDocumentClick)
    }, [mode, isAIPromptSubmitDisabled, isReviewing, question, error, acceptAISelection, deletePrompt])

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
                    error: '',
                },
            }
        })
        updateAIPromptQuery(nextQuestion)
    }

    const handleRunPrompt = (queryToRun: string = question): void => {
        if (!queryToRun.trim() || isAIPromptSubmitDisabled) {
            return
        }
        if (error) {
            updateNode(node.id, (currentNode) => {
                if (!isPromptComponentNode(currentNode)) {
                    return currentNode
                }
                return { ...currentNode, props: { ...currentNode.props, error: '' } }
            })
        }
        setShowPresets(false)
        submitAIPrompt(queryToRun)
    }

    const handleAccept = (): void => {
        acceptAISelection()
    }

    const handleReject = (): void => {
        rejectAISelection()
    }

    const handleRetry = (): void => {
        setIsReviewing(false)
        if (question.trim()) {
            handleRunPrompt(question)
        }
    }

    const deletePrompt = (): void => {
        deleteNodeAndFocusAdjacent()
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
        event.stopPropagation()

        if (showPresets && !question.trim()) {
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                setSelectedPresetIndex((prev) => (prev + 1) % PRESET_ACTIONS.length)
                return
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault()
                setSelectedPresetIndex((prev) => (prev <= 0 ? PRESET_ACTIONS.length - 1 : prev - 1))
                return
            }
            if (event.key === 'Enter' && selectedPresetIndex >= 0) {
                event.preventDefault()
                const preset = PRESET_ACTIONS[selectedPresetIndex]
                if (preset) {
                    updateQuestion(preset.prompt)
                    handleRunPrompt(preset.prompt)
                }
                return
            }
        }

        if (event.key === 'Enter') {
            event.preventDefault()
            handleRunPrompt(event.currentTarget.value)
            return
        }

        if (event.key === 'Tab' && !question.trim()) {
            event.preventDefault()
            setShowPresets((prev) => !prev)
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
            if (showPresets) {
                setShowPresets(false)
                return
            }
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

    // Review Mode: After AI generates text, show Accept (✓), Retry (↻), and Reject (✕)
    if (isReviewing) {
        return (
            <div ref={wrapperRef} className="MarkdownNotebook__text-row MarkdownNotebook__text-row--ai-prompt">
                <div
                    className={clsx('WimInlinePill', 'WimInlinePill--review', isFlipped && 'WimInlinePill--flipped')}
                    contentEditable={false}
                    data-markdown-notebook-node-id={node.id}
                >
                    {/* Accept (✓) Button */}
                    <button
                        type="button"
                        className="WimInlinePill__acceptBtn"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleAccept}
                        title="Accept (Tab / Enter)"
                    >
                        <IconCheck className="size-3.5 stroke-[2.5]" />
                    </button>

                    {/* Retry (↻) Button */}
                    <button
                        type="button"
                        className="WimInlinePill__retryBtn"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleRetry}
                        title="Regenerate"
                    >
                        <IconRefresh className="size-3" />
                    </button>

                    {/* Reject (✕) Button */}
                    <button
                        type="button"
                        className="WimInlinePill__rejectBtn"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleReject}
                        title="Discard (Esc)"
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
                    isAIPromptSubmitDisabled && 'WimInlinePill--busy',
                    error && 'WimInlinePill--error'
                )}
                contentEditable={false}
                data-markdown-notebook-node-id={node.id}
            >
                {/* Left (+) Plus Button */}
                <button
                    type="button"
                    className="WimInlinePill__plusBtn"
                    onClick={() => {
                        setShowPresets(!showPresets)
                        setSelectedPresetIndex(0)
                    }}
                    title="Actions (Tab)"
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
                    placeholder={selectedMarkdown ? 'Ask WIM AI to edit…' : 'Ask WIM AI to write…'}
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
            {error ? <p className="WimInlinePill__error">{error}</p> : null}

            {/* Presets Popup Menu when (+) or Tab is triggered */}
            {showPresets && !question.trim() && (
                <div className={clsx('WimInlinePill__presets', isFlipped ? 'WimInlinePill__presets--top' : 'WimInlinePill__presets--bottom')}>
                    {PRESET_ACTIONS.map((preset, index) => {
                        const IconComponent = preset.Icon
                        const isSelected = selectedPresetIndex === index
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                className={clsx('WimInlinePill__presetItem', isSelected && 'WimInlinePill__presetItem--selected')}
                                onClick={() => {
                                    updateQuestion(preset.prompt)
                                    handleRunPrompt(preset.prompt)
                                }}
                                title={preset.prompt}
                            >
                                <IconComponent className="size-3 text-[#a1a1aa] flex-shrink-0" />
                                <span>{preset.label}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}





