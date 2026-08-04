import { useState, useRef, useEffect } from 'react'
import { LemonModal, LemonButton, LemonTag, LemonSelect } from '~nb-lib/lemon-ui/index'
import {
    IconTerminal,
    IconFlask,
    IconPlay,
    IconArrowRight,
    IconLogomark,
    IconBook,
    IconCode,
    IconFlag,
    IconSearch,
} from '@posthog/icons'
import { IconRobot } from '../../lib/icons/iconsShim'

export interface NotebookAIWriterModalProps {
    isOpen: boolean
    onClose: () => void
    onInsertContent: (generatedMarkdown: string) => void
}

const PRODUCT_CAPABILITY_BADGES = [
    { key: 'analytics', label: 'Analytics', icon: <IconTerminal className="w-3 h-3 text-[#1d4ed8]" /> },
    { key: 'replays', label: 'Replays', icon: <IconPlay className="w-3 h-3 text-[#5925dc]" /> },
    { key: 'flags', label: 'Flags', icon: <IconFlag className="w-3 h-3 text-[#12b76a]" /> },
    { key: 'experiments', label: 'Experiments', icon: <IconFlask className="w-3 h-3 text-[#f79009]" /> },
    { key: 'learn', label: 'Learn', icon: <IconBook className="w-3 h-3 text-[#0891b2]" /> },
    { key: 'code', label: 'Code', icon: <IconCode className="w-3 h-3 text-[#c026d3]" />, beta: true },
]

const AGENT_MODE_OPTIONS = [
    {
        title: 'General',
        options: [
            {
                value: 'auto',
                label: (
                    <span className="flex items-center gap-1.5 text-xs">
                        <IconRobot className="w-3.5 h-3.5 text-orange-500" />
                        <span>Auto (General)</span>
                    </span>
                ),
            },
            {
                value: 'research',
                label: (
                    <span className="flex items-center gap-1.5 text-xs">
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
                    <span className="flex items-center gap-1.5 text-xs">
                        <IconTerminal className="w-3.5 h-3.5 text-blue-400" />
                        <span>Analytics Agent</span>
                    </span>
                ),
            },
            {
                value: 'replays',
                label: (
                    <span className="flex items-center gap-1.5 text-xs">
                        <IconPlay className="w-3.5 h-3.5 text-purple-400" />
                        <span>Session Replays Agent</span>
                    </span>
                ),
            },
            {
                value: 'flags',
                label: (
                    <span className="flex items-center gap-1.5 text-xs">
                        <IconFlag className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Feature Flags Agent</span>
                    </span>
                ),
            },
            {
                value: 'experiments',
                label: (
                    <span className="flex items-center gap-1.5 text-xs">
                        <IconFlask className="w-3.5 h-3.5 text-amber-400" />
                        <span>Experimentation Agent</span>
                    </span>
                ),
            },
        ],
    },
]

export function NotebookAIWriterModal({
    isOpen,
    onClose,
    onInsertContent,
}: NotebookAIWriterModalProps): JSX.Element | null {
    const [prompt, setPrompt] = useState('')
    const [selectedCapability, setSelectedCapability] = useState<string>('analytics')
    const [selectedAgentMode, setSelectedAgentMode] = useState<string>('auto')
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => textAreaRef.current?.focus(), 100)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleGenerate = (customPrompt?: string) => {
        const text = customPrompt || prompt
        if (!text.trim()) return

        // Insert ONLY the Chatbot AI Prompt Block into the notebook canvas!
        const escapedPrompt = text.trim().replace(/"/g, '&quot;')
        onInsertContent(`\n<ph-prompt question="${escapedPrompt}" />\n`)
        setPrompt('')
        onClose()
    }

    return (
        <LemonModal
            isOpen={isOpen}
            onClose={onClose}
            width={680}
            className="PostHogAIModal"
        >
            <div className="flex flex-col gap-3 text-slate-200">
                {/* Compact Minimal Header */}
                <div className="flex items-center justify-between border-b border-[#2c2d38] pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow">
                            <IconRobot className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                            <IconLogomark className="w-4 h-4 text-orange-500" />
                            <span>PostHog AI</span>
                        </div>
                        <LemonTag type="highlight" size="small" className="text-[10px] px-1.5 py-0">CHAT BLOCK INSERT</LemonTag>
                    </div>

                    {/* Compact Horizontal Capability Badges */}
                    <div className="flex items-center gap-1">
                        {PRODUCT_CAPABILITY_BADGES.map((badge) => (
                            <LemonButton
                                key={badge.key}
                                size="xsmall"
                                type={selectedCapability === badge.key ? 'primary' : 'tertiary'}
                                icon={badge.icon}
                                className="!py-0.5 !px-1.5 text-[11px]"
                                onClick={() => {
                                    setSelectedCapability(badge.key)
                                    if (badge.key === 'analytics') {
                                        setPrompt('What is the retention in the last two weeks?')
                                    } else if (badge.key === 'replays') {
                                        setPrompt('Summarize recent session replays for checkout drop-off.')
                                    } else if (badge.key === 'flags') {
                                        setPrompt('How do I create a feature flag for rollout?')
                                    } else if (badge.key === 'experiments') {
                                        setPrompt('Help me set up an A/B experiment evaluation plan.')
                                    } else if (badge.key === 'learn') {
                                        setPrompt('How can I capture custom telemetry events?')
                                    } else if (badge.key === 'code') {
                                        setPrompt('Write a HogQL SQL query to count total pageviews per user.')
                                    }
                                }}
                            >
                                {badge.label}
                            </LemonButton>
                        ))}
                    </div>
                </div>

                {/* EXPANDED & MINIMAL CHATBOT TEXTAREA CANVAS */}
                <div className="relative w-full flex flex-col">
                    <label
                        htmlFor="posthog-ai-question-input"
                        className="input-like flex flex-col cursor-text border border-[#3b3c4a] focus-within:border-blue-500 bg-[#15161b] rounded-xl p-3 shadow-xl transition-all"
                    >
                        <div className="relative w-full">
                            <textarea
                                id="posthog-ai-question-input"
                                ref={textAreaRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Type a prompt to insert as an AI Chatbot block..."
                                rows={6}
                                className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed min-h-[120px]"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        e.preventDefault()
                                        handleGenerate()
                                    }
                                }}
                            />
                        </div>

                        {/* Minimal Bottom Bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#2c2d38]/80 text-[11px]">
                            {/* Minimal ModeSelector */}
                            <LemonSelect
                                value={selectedAgentMode}
                                onChange={(val) => setSelectedAgentMode(val || 'auto')}
                                options={AGENT_MODE_OPTIONS}
                                size="xsmall"
                                type="tertiary"
                                dropdownPlacement="top-start"
                                dropdownMatchSelectWidth={false}
                                className="border border-[#2c2d38] bg-[#111216] !py-0.5"
                            />

                            {/* Minimal Controls */}
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 text-[10px] hidden sm:inline font-mono">
                                    Cmd + Enter
                                </span>

                                <LemonButton
                                    type="primary"
                                    size="small"
                                    icon={<IconArrowRight />}
                                    onClick={() => handleGenerate()}
                                    disabled={!prompt.trim()}
                                    tooltip="Insert Chatbot Block into Notebook (Cmd + Enter)"
                                />
                            </div>
                        </div>
                    </label>
                </div>
            </div>
        </LemonModal>
    )
}
