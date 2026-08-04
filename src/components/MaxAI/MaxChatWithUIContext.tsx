import React, { useState, useRef, useEffect } from 'react'
import {
    IconExternal,
    IconSidePanel,
    IconThumbsUp,
    IconThumbsDown,
    IconCopy,
    IconRefresh,
    IconEye,
    IconChevronDown,
    IconArrowRight,
    IconAtSign,
    IconShuffle,
    IconX,
    IconCheck,
    IconWarning,
} from '@posthog/icons'
import { LemonButton } from '../LemonUI/LemonButton'
import { LemonTag } from '../LemonUI/LemonTag'
import { LemonBanner } from '../LemonUI/LemonBanner'
import { ContextDrawer } from './ContextDrawer'
import { ReasoningAnswer } from './ActivityPrimitives'

export interface MaxChatWithUIContextProps {
    onClose?: () => void
}

// Official Storybook Story Presets from `Max.stories.tsx`
const STORYBOOK_PRESETS = [
    {
        id: 'chat-with-ui-context',
        name: 'ChatWithUIContext',
        badge: 'Official Story',
        messages: [
            {
                id: 'human-1',
                type: 'human',
                contextBadge: 'With 1 event ($pageview)',
                content: 'Tell me about the $pageview event',
            },
            {
                id: 'ai-1',
                type: 'ai',
                reasoning: 'Picking relevant events and properties → Generating trends',
                content:
                    'Based on the event context you provided, the $pageview event is a standard event that tracks when users view pages in your application. This event helps you understand user navigation patterns and page popularity. It typically captures properties like the page URL, referrer, and timestamp.',
            },
        ],
    },
    {
        id: 'welcome',
        name: 'Welcome (Empty State)',
        badge: 'Intro',
        messages: [],
    },
    {
        id: 'quick-replies',
        name: 'ThreadWithQuickReplies',
        badge: 'Form Options',
        messages: [
            {
                id: 'human-1',
                type: 'human',
                content: 'Can you summarize our project product taxonomy?',
            },
            {
                id: 'ai-1',
                type: 'ai',
                reasoning: 'Reading data taxonomy → Aggregating event definitions',
                content:
                    'Your project has 14 tracked events including $pageview, $autocapture, and $identify. Does this look like an accurate summary of what your product does?',
                quickReplies: ['Yes, save this', 'No, not quite right'],
            },
        ],
    },
    {
        id: 'shared-thread',
        name: 'SharedThread',
        badge: 'Shared Analysis',
        messages: [
            {
                id: 'human-1',
                type: 'human',
                content: 'Can you analyze our user retention patterns and suggest improvements?',
            },
            {
                id: 'ai-1',
                type: 'ai',
                reasoning: 'Running retention query across 30-day cohort matrix',
                content:
                    'Here is the retention breakdown for active users:\n\n- **Day 1 Retention**: 42.8%\n- **Day 7 Retention**: 21.4%\n- **Day 30 Retention**: 12.1%\n\nUsers who trigger `$autocapture` on the primary CTA within their first session show 3.2x higher Day 30 retention.',
            },
        ],
    },
    {
        id: 'billing-limit',
        name: 'BillingLimitExceeded',
        badge: 'Limit Error',
        banner: {
            type: 'error' as const,
            text: 'Your organization reached its AI credit usage limit. Increase the limits in Billing or contact your org admin.',
        },
        messages: [],
    },
]

export function MaxChatWithUIContext({ onClose }: MaxChatWithUIContextProps): JSX.Element {
    const [activePreset, setActivePreset] = useState(STORYBOOK_PRESETS[0])
    const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false)
    const [messages, setMessages] = useState<any[]>(STORYBOOK_PRESETS[0].messages)
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [selectedMode, setSelectedMode] = useState('Auto')
    const [showContextPicker, setShowContextPicker] = useState(false)
    const [activeContexts, setActiveContexts] = useState<string[]>(['1 event ($pageview)'])
    const [showStorySelector, setShowStorySelector] = useState(false)
    const threadRef = useRef<HTMLDivElement>(null)

    const handleSelectPreset = (preset: (typeof STORYBOOK_PRESETS)[0]) => {
        setActivePreset(preset)
        setMessages(preset.messages)
        setShowStorySelector(false)
    }

    const handleSend = () => {
        if (!input.trim() || loading) return

        const userMsg = {
            id: `human-${Date.now()}`,
            type: 'human',
            contextBadge: activeContexts.length > 0 ? `With ${activeContexts.length} item` : undefined,
            content: input.trim(),
        }

        setMessages((prev) => [...prev, userMsg])
        setInput('')
        setLoading(true)

        setTimeout(() => {
            const aiMsg = {
                id: `ai-${Date.now()}`,
                type: 'ai',
                reasoning: 'Evaluating prompt bindings → Fetching HogQL query plan',
                content: `Analyzed query **"${input.trim()}"** against PostHog telemetry engine.\n\nHere is the generated HogQL response:\n\`\`\`sql\nSELECT properties.$current_url, count(*)\nFROM events\nWHERE event = '$pageview'\nGROUP BY properties.$current_url\nORDER BY count(*) DESC\nLIMIT 5\n\`\`\``,
            }
            setMessages((prev) => [...prev, aiMsg])
            setLoading(false)
        }, 1000)
    }

    useEffect(() => {
        if (threadRef.current) {
            threadRef.current.scrollTop = threadRef.current.scrollHeight
        }
    }, [messages, loading])

    return (
        <div className="MaxChatWithUIContext flex flex-col h-full w-full bg-[#f4f4f3] dark:bg-[#18191c] text-[#1d1f26] dark:text-[#f0f0f0] font-sans relative select-none">
            {/* ── Top Bar with Storybook Scenario Switcher ── */}
            <div className="flex items-center justify-between p-3 border-b border-[var(--lemon-border)] bg-white dark:bg-[#23252e] flex-shrink-0">
                <div className="flex items-center gap-2 relative">
                    <div className="text-xs font-bold font-rounded text-blue-600 flex items-center gap-1">
                        <span>🦔</span>
                        <span>PostHog AI</span>
                    </div>

                    <LemonButton
                        type="secondary"
                        size="xsmall"
                        sideIcon={<IconChevronDown style={{ width: 12, height: 12 }} />}
                        onClick={() => setShowStorySelector((v) => !v)}
                    >
                        <span className="font-semibold">{activePreset.name}</span>
                    </LemonButton>

                    {/* Storybook Story Dropdown Picker */}
                    {showStorySelector && (
                        <div className="absolute left-20 top-full mt-1 w-64 bg-white dark:bg-[#23252e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 text-xs">
                            <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                                Official Storybook Stories (Max.stories.tsx)
                            </div>
                            {STORYBOOK_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => handleSelectPreset(preset)}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                        activePreset.id === preset.id
                                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-semibold'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <span>{preset.name}</span>
                                    <LemonTag
                                        size="small"
                                        type={activePreset.id === preset.id ? 'completion' : 'default'}
                                    >
                                        {preset.badge}
                                    </LemonTag>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <LemonButton
                        type="secondary"
                        size="small"
                        sideIcon={<IconExternal style={{ width: 14, height: 14 }} />}
                        onClick={() => {
                            if (typeof window !== 'undefined') navigator.clipboard.writeText(window.location.href)
                        }}
                    >
                        Copy link
                    </LemonButton>
                    <LemonButton
                        type="secondary"
                        size="small"
                        sideIcon={<IconSidePanel style={{ width: 14, height: 14 }} />}
                        onClick={() => setIsContextDrawerOpen((v) => !v)}
                    >
                        Open in context panel
                    </LemonButton>
                    {onClose && (
                        <LemonButton
                            type="tertiary"
                            size="small"
                            icon={<IconX style={{ width: 14, height: 14 }} />}
                            onClick={onClose}
                        />
                    )}
                </div>
            </div>

            {/* ── Banner Notification (if active preset has error/warning) ── */}
            {activePreset.banner && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 flex-shrink-0">
                    <LemonBanner type={activePreset.banner.type}>{activePreset.banner.text}</LemonBanner>
                </div>
            )}

            {/* ── Thread & Messages Area ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center" ref={threadRef}>
                <div className="w-full max-w-3xl flex flex-col gap-6">
                    {/* Welcome Screen (if empty) */}
                    {messages.length === 0 && !activePreset.banner && (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 w-full">
                            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center text-2xl">
                                🦔
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold font-rounded text-[var(--lemon-text-primary)]">
                                What would you like to build or analyze today?
                            </h2>
                            <p className="text-xs text-slate-500 italic">Build something people want.</p>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${msg.type === 'human' ? 'items-end' : 'items-start'}`}
                        >
                            {/* Human Message */}
                            {msg.type === 'human' && (
                                <div className="flex flex-col items-end gap-1.5 max-w-[85%]">
                                    {msg.contextBadge && (
                                        <div className="flex items-center gap-1 text-[12px] text-slate-500 bg-white dark:bg-[#23252e] border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md shadow-xs font-mono">
                                            <span>📄</span>
                                            <span>{msg.contextBadge}</span>
                                        </div>
                                    )}
                                    <div className="bg-white dark:bg-[#23252e] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 text-[14px] leading-relaxed shadow-xs font-medium">
                                        {msg.content}
                                    </div>
                                </div>
                            )}

                            {/* AI Message */}
                            {msg.type === 'ai' && (
                                <div className="flex flex-col gap-2.5 max-w-[90%] w-full">
                                    {msg.reasoning && (
                                        <ReasoningAnswer
                                            id={`reasoning-${msg.id}`}
                                            content={msg.reasoning}
                                            completed={true}
                                        />
                                    )}

                                    <div className="bg-white dark:bg-[#23252e] border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-[14px] text-slate-800 dark:text-slate-200 leading-relaxed shadow-xs space-y-3">
                                        {msg.content}
                                    </div>

                                    {/* Form Quick Replies */}
                                    {msg.quickReplies && (
                                        <div className="flex items-center gap-2 pt-1">
                                            {msg.quickReplies.map((reply: string, idx: number) => (
                                                <LemonButton
                                                    key={idx}
                                                    type={idx === 0 ? 'primary' : 'secondary'}
                                                    size="small"
                                                    onClick={() => handleSend()}
                                                >
                                                    {reply}
                                                </LemonButton>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action Bar */}
                                    <div className="flex items-center gap-3 text-slate-400 px-1 pt-0.5">
                                        <button
                                            className="hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                                            title="Helpful"
                                        >
                                            <IconThumbsUp style={{ width: 14, height: 14 }} />
                                        </button>
                                        <button
                                            className="hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                                            title="Unhelpful"
                                        >
                                            <IconThumbsDown style={{ width: 14, height: 14 }} />
                                        </button>
                                        <button
                                            className="hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                                            title="Copy response"
                                        >
                                            <IconCopy style={{ width: 14, height: 14 }} />
                                        </button>
                                        <button
                                            className="hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                                            title="Regenerate"
                                        >
                                            <IconRefresh style={{ width: 14, height: 14 }} />
                                        </button>
                                        <button
                                            className="hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                                            title="View details"
                                        >
                                            <IconEye style={{ width: 14, height: 14 }} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                            <span className="animate-spin">⏳</span>
                            <span>PostHog AI is generating answer…</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Input Box ── */}
            <div className="p-4 sm:p-6 flex justify-center flex-shrink-0">
                <div className="w-full max-w-3xl bg-white dark:bg-[#23252e] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                        placeholder="Ask follow-up or / for commands"
                        rows={2}
                        className="w-full bg-transparent border-none outline-none resize-none text-[14px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-sans"
                    />

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 relative">
                            <LemonButton
                                type="tertiary"
                                size="xsmall"
                                sideIcon={<IconChevronDown style={{ width: 12, height: 12 }} />}
                                icon={<IconShuffle style={{ width: 13, height: 13 }} />}
                            >
                                {selectedMode}
                            </LemonButton>

                            <LemonButton
                                type="tertiary"
                                size="xsmall"
                                sideIcon={<IconChevronDown style={{ width: 12, height: 12 }} />}
                                icon={<IconAtSign style={{ width: 13, height: 13 }} />}
                                onClick={() => setShowContextPicker((v) => !v)}
                            >
                                Add context
                            </LemonButton>

                            {activeContexts.map((ctx, i) => (
                                <LemonTag
                                    key={i}
                                    type="completion"
                                    size="small"
                                    onClose={() => setActiveContexts(activeContexts.filter((_, idx) => idx !== i))}
                                >
                                    {ctx}
                                </LemonTag>
                            ))}
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                input.trim()
                                    ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700 shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <IconArrowRight style={{ width: 15, height: 15 }} />
                        </button>
                    </div>
                </div>
            </div>

            <ContextDrawer
                isOpen={isContextDrawerOpen}
                onClose={() => setIsContextDrawerOpen(false)}
                onSelectContext={(tag) => {
                    setActiveContexts((prev) => [...prev, tag])
                }}
            />
        </div>
    )
}
