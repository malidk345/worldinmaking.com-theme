import clsx from 'clsx'
import { KeyboardEvent, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'

import {
    IconArrowRight,
    IconTrash,
    IconRobot,
    IconTerminal,
    IconPlay,
    IconFlag,
    IconFlask,
    IconSearch,
} from '@posthog/icons'
import { LemonButton, LemonTag, LemonSelect } from '@posthog/lemon-ui'

import { getNotebookStringProp, isPromptComponentNode } from './documentModel'
import { RestoreSelectionRequest } from './editorTypes'
import { NotebookBlockNode, NotebookComponentBlockNode, NotebookMode } from './types'

const AGENT_MODE_OPTIONS = [
    {
        title: 'General',
        options: [
            {
                value: 'auto',
                label: (
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                        <IconRobot className="w-3.5 h-3.5 text-orange-500" />
                        <span>Auto (General)</span>
                    </span>
                ),
            },
            {
                value: 'research',
                label: (
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                        <IconSearch className="w-3.5 h-3.5 text-blue-400" />
                        <span>Research Mode</span>
                        <LemonTag type="warning" size="small" className="ml-auto text-[8px] px-1 py-0">BETA</LemonTag>
                    </span>
                ),
            },
        ],
    },
    {
        title: 'Specialized Agents',
        options: [
            {
                value: 'analytics',
                label: (
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                        <IconTerminal className="w-3.5 h-3.5 text-blue-400" />
                        <span>Analytics Agent</span>
                    </span>
                ),
            },
            {
                value: 'replays',
                label: (
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                        <IconPlay className="w-3.5 h-3.5 text-purple-400" />
                        <span>Session Replays Agent</span>
                    </span>
                ),
            },
            {
                value: 'flags',
                label: (
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                        <IconFlag className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Feature Flags Agent</span>
                    </span>
                ),
            },
            {
                value: 'experiments',
                label: (
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                        <IconFlask className="w-3.5 h-3.5 text-amber-400" />
                        <span>Experimentation Agent</span>
                    </span>
                ),
            },
        ],
    },
]

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
    const [selectedAgentMode, setSelectedAgentMode] = useState<string>('auto')
    const [isGenerating, setIsGenerating] = useState(false)
    const question = getNotebookStringProp(node.props.question) ?? ''

    const setElementRef = useCallback(
        (element: HTMLTextAreaElement | null): void => {
            elementRef.current = element
            setBlockRef(element)
        },
        [setBlockRef]
    )

    useEffect(() => {
        const element = elementRef.current
        if (!isActive || !element || document.activeElement === element) {
            return
        }
        element.focus()
        element.setSelectionRange(question.length, question.length)
    }, [isActive, question.length])

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

    const handleRunPrompt = async (queryToRun: string = question) => {
        if (!queryToRun.trim() || isGenerating) return
        setIsGenerating(true)

        try {
            const systemInstructions = `You are an AI Assistant inside a Notebook. Mode: ${selectedAgentMode}. Generate markdown.`

            const response = await fetch('/api/bots/act', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    bot: 'nietzsche',
                    taskType: 'paper_section',
                    question: `${systemInstructions}\n\nUser Request: ${queryToRun.trim()}`,
                    context: queryToRun.trim().slice(0, 12000),
                }),
            })
            const data = await response.json().catch(() => null)
            const candidateText = response.ok && typeof data?.reply === 'string' ? data.reply : ''

            if (candidateText) {
                updateNode(node.id, () => ({
                    id: node.id,
                    type: 'paragraph',
                    children: [{ type: 'text', text: candidateText.trim() }],
                }))
            } else {
                submitAIPrompt(queryToRun)
            }
        } catch (error) {
            console.warn('Gemini API fallback:', error)
            submitAIPrompt(queryToRun)
        } finally {
            setIsGenerating(false)
        }
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

        if (event.key === 'Backspace' && question.length === 0) {
            event.preventDefault()
            deletePrompt()
        }
    }

    const applyPreset = (presetText: string) => {
        const next = question ? `${question} (${presetText})` : presetText
        updateQuestion(next)
    }

    return (
        <div className="MarkdownNotebook__text-row MarkdownNotebook__text-row--ai-prompt my-5">
            <div
                className={clsx(
                    'relative w-full rounded-xl p-4 sm:p-5 shadow-xs transition-all duration-200 border border-[var(--color-border-primary)]',
                    'bg-surface-primary text-primary',
                    isGenerating && 'animate-pulse ring-1 ring-[var(--color-border-primary)]'
                )}
                contentEditable={false}
                data-markdown-notebook-node-id={node.id}
            >
                {/* TOP HEADER BADGE BAR */}
                <div className="flex items-center justify-between border-b border-[var(--color-border-primary)] pb-3 mb-3">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center size-6 rounded bg-surface-secondary text-primary">
                            <IconRobot className="size-3.5 text-primary" />
                        </span>
                        <span className="font-semibold text-xs text-primary tracking-wide">AI Assistant</span>
                        <LemonTag type={isGenerating ? 'warning' : 'completion'} size="small" className="text-[10px] uppercase font-bold tracking-wider">
                            {isGenerating ? 'Thinking…' : 'Ready'}
                        </LemonTag>
                    </div>

                    {/* QUICK PRESET CHIPS */}
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                        <button
                            type="button"
                            onClick={() => applyPreset('Summarize key points')}
                            className="px-2 py-0.5 rounded border border-[var(--color-border-primary)] hover:bg-surface-secondary text-secondary hover:text-primary transition-all bg-surface-primary"
                        >
                            Summarize
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset('Convert into a Markdown table')}
                            className="px-2 py-0.5 rounded border border-[var(--color-border-primary)] hover:bg-surface-secondary text-secondary hover:text-primary transition-all bg-surface-primary"
                        >
                            Table
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset('Extract action items & tasks')}
                            className="px-2 py-0.5 rounded border border-[var(--color-border-primary)] hover:bg-surface-secondary text-secondary hover:text-primary transition-all bg-surface-primary"
                        >
                            Tasks
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset('Polish & format markdown')}
                            className="px-2 py-0.5 rounded border border-[var(--color-border-primary)] hover:bg-surface-secondary text-secondary hover:text-primary transition-all bg-surface-primary"
                        >
                            Polish
                        </button>
                    </div>
                </div>

                {/* TEXTAREA INPUT AREA */}
                <textarea
                    ref={setElementRef}
                    value={question}
                    onChange={(event) => {
                        event.stopPropagation()
                        updateQuestion(event.currentTarget.value)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask AI anything about this notebook or write a prompt..."
                    rows={4}
                    className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none resize-none leading-relaxed min-h-[110px] p-0 border-none shadow-none font-medium"
                    disabled={mode !== 'edit' || isGenerating}
                />

                {/* BOTTOM ACTION BAR */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-primary)] text-xs">
                    <LemonSelect
                        value={selectedAgentMode}
                        onChange={(val) => setSelectedAgentMode(val || 'auto')}
                        options={AGENT_MODE_OPTIONS}
                        size="small"
                        type="tertiary"
                        dropdownPlacement="top-start"
                        dropdownMatchSelectWidth={false}
                        className="rounded border border-border bg-surface-secondary text-primary"
                    />

                    <div className="flex items-center gap-2.5">
                        <span className="text-muted text-[11px] hidden sm:inline font-mono opacity-70">
                            ⌘ + Enter
                        </span>

                        <LemonButton
                            type="primary"
                            size="small"
                            icon={<IconArrowRight />}
                            onClick={() => handleRunPrompt()}
                            loading={isGenerating}
                            disabled={!question.trim()}
                            tooltip="Run Prompt (Cmd + Enter)"
                            className="shadow-md"
                        >
                            <span className="font-semibold">Run</span>
                        </LemonButton>

                        <LemonButton
                            size="xsmall"
                            type="tertiary"
                            status="danger"
                            icon={<IconTrash />}
                            tooltip="Delete Chat Block"
                            onClick={deletePrompt}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
