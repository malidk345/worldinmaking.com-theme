import clsx from 'clsx'
import { KeyboardEvent, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'

import {
    IconArrowRight,
    IconTrash,
    IconSparkles,
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

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''

const AGENT_MODE_OPTIONS = [
    {
        title: 'General',
        options: [
            {
                value: 'auto',
                label: (
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                        <IconSparkles className="w-3.5 h-3.5 text-orange-500" />
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

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: `${systemInstructions}\n\nUser Request: ${queryToRun.trim()}`
                                    }
                                ]
                            }
                        ]
                    })
                }
            )

            const data = await response.json()
            const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text

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

    return (
        <div className="MarkdownNotebook__text-row MarkdownNotebook__text-row--ai-prompt my-4">
            <div
                className="relative w-full border border-[#2c2d38] bg-[#15161b] rounded-xl p-4 shadow-2xl space-y-3 text-slate-200"
                contentEditable={false}
                data-markdown-notebook-node-id={node.id}
            >
                {/* DIRECT FRAMELESS CHATBOT TEXTAREA */}
                <textarea
                    ref={setElementRef}
                    value={question}
                    onChange={(event) => {
                        event.stopPropagation()
                        updateQuestion(event.currentTarget.value)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question or type / for commands..."
                    rows={6}
                    className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed min-h-[140px] p-0 border-none shadow-none"
                    disabled={mode !== 'edit' || isGenerating}
                />

                {/* BOTTOM ACTION CONTROLS */}
                <div className="flex items-center justify-between pt-3 border-t border-[#2c2d38] text-xs">
                    <LemonSelect<string>
                        value={selectedAgentMode}
                        onChange={(val: any) => setSelectedAgentMode(String(val || 'auto'))}
                        options={AGENT_MODE_OPTIONS as any}
                        size="small"
                        type="tertiary"
                        className="border border-[#2c2d38] bg-[#111216]"
                    />

                    <div className="flex items-center gap-3">
                        <span className="text-slate-500 text-xs hidden sm:inline font-mono">
                            Cmd + Enter
                        </span>

                        <LemonButton
                            type="primary"
                            size="small"
                            icon={<IconArrowRight />}
                            onClick={() => handleRunPrompt()}
                            loading={isGenerating}
                            disabled={!question.trim()}
                            tooltip="Run Prompt (Cmd + Enter)"
                        />

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
