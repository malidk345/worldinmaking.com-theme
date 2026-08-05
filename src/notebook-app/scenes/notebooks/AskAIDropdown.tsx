import { useState, useRef, useEffect } from 'react'
import { LemonDropdown, LemonButton, LemonSelect, ProfilePicture, LemonTag } from '~nb-lib/lemon-ui/index'
import {
    IconSparkles,
    IconChevronDown,
    IconArrowRight,
    IconTrash,
    IconPlus,
} from '@posthog/icons'

export interface AskAIDropdownProps {
    onInsertPromptBlock: (initialPrompt?: string) => void
}

export interface ChatMessage {
    id: string
    sender: 'user' | 'ai'
    text: string
    timestamp: string
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''

const BOTS = [
    { value: 'aria', name: 'Aria', hint: 'General writing' },
    { value: 'nova', name: 'Nova', hint: 'Product & specs' },
    { value: 'rex', name: 'Rex', hint: 'Engineering' },
    { value: 'luna', name: 'Luna', hint: 'Research' },
    { value: 'zed', name: 'Zed', hint: 'Data & HogQL' },
    { value: 'sage', name: 'Sage', hint: 'Summaries' },
]

const SUGGESTIONS = [
    'Summarize this notebook',
    'Draft a release note',
    'Explain the next steps',
    'Turn notes into action items',
]

const BOT_SELECT_OPTIONS = [
    {
        options: BOTS.map((bot) => ({
            value: bot.value,
            label: (
                <span className="flex items-center gap-2 py-0.5">
                    <ProfilePicture user={{ first_name: bot.name }} size="sm" />
                    <span className="flex flex-col leading-tight">
                        <span className="font-medium text-xs">{bot.name}</span>
                        <span className="text-[10px] text-muted">{bot.hint}</span>
                    </span>
                </span>
            ),
        })),
    },
]

export function AskAIDropdown({ onInsertPromptBlock }: AskAIDropdownProps): JSX.Element {
    const [isOpen, setIsOpen] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [selectedBot, setSelectedBot] = useState('aria')
    const [isGenerating, setIsGenerating] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const chatEndRef = useRef<HTMLDivElement | null>(null)

    const activeBot = BOTS.find((b) => b.value === selectedBot) || BOTS[0]!
    const hasThread = messages.length > 0 || isGenerating

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => textareaRef.current?.focus(), 50)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isGenerating])

    const sendPrompt = async (raw?: string) => {
        const text = (raw ?? prompt).trim()
        if (!text || isGenerating) return

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }

        setMessages((prev) => [...prev, userMsg])
        setPrompt('')
        setIsGenerating(true)

        try {
            const conversationContext = messages
                .map((m) => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
                .join('\n')

            const systemInstructions = `You are a helpful AI assistant named ${activeBot.name} (${activeBot.hint}). Answer concisely using markdown.`

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
                                        text: `${systemInstructions}\n\nPrevious Conversation:\n${conversationContext}\n\nUser Request: ${text}`,
                                    },
                                ],
                            },
                        ],
                    }),
                }
            )

            const data = await response.json()
            const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text

            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    sender: 'ai',
                    text: candidateText ? candidateText.trim() : 'I could not generate a response. Try again.',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
            ])
        } catch (error) {
            console.warn('AI error:', error)
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    sender: 'ai',
                    text: 'Something went wrong while generating a reply. Please try again.',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
            ])
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <LemonDropdown
            visible={isOpen}
            onVisibilityChange={setIsOpen}
            onClickOutside={() => setIsOpen(false)}
            placement="bottom-end"
            closeOnClickInside={false}
            overlay={
                <div
                    className="w-[min(420px,92vw)] flex flex-col text-primary"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Compact header — single row, no extra chrome boxes */}
                    <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-surface-secondary">
                            <IconSparkles className="text-orange size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-sm leading-none">Ask AI</span>
                                <LemonTag type="muted" size="small">
                                    Beta
                                </LemonTag>
                            </div>
                            <p className="text-[11px] text-muted mt-1 mb-0 truncate">
                                Write with {activeBot.name} · insert straight into the notebook
                            </p>
                        </div>
                        {hasThread && (
                            <LemonButton
                                size="xsmall"
                                type="tertiary"
                                icon={<IconTrash />}
                                onClick={() => setMessages([])}
                                tooltip="Clear conversation"
                            />
                        )}
                    </div>

                    {/* Thread or empty state — flat, no nested black panels */}
                    <div className="px-3 max-h-[320px] overflow-y-auto">
                        {!hasThread ? (
                            <div className="py-2 space-y-3">
                                <p className="text-xs text-muted mb-0">
                                    Ask for a summary, draft, rewrite, or action list. Pick a specialist agent if you
                                    want a tighter voice.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {SUGGESTIONS.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            className="text-left text-xs px-2.5 py-1.5 rounded-full border border-border bg-surface-secondary hover:bg-surface-tertiary transition-colors"
                                            onClick={() => sendPrompt(suggestion)}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-1 space-y-3">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col gap-1 ${
                                            msg.sender === 'user' ? 'items-end' : 'items-start'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted">
                                            {msg.sender === 'ai' ? (
                                                <>
                                                    <ProfilePicture user={{ first_name: activeBot.name }} size="xs" />
                                                    <span className="font-medium text-secondary">{activeBot.name}</span>
                                                </>
                                            ) : (
                                                <span className="font-medium text-secondary">You</span>
                                            )}
                                            <span>{msg.timestamp}</span>
                                        </div>

                                        <div
                                            className={`max-w-[92%] text-xs leading-relaxed whitespace-pre-wrap px-3 py-2 rounded-2xl ${
                                                msg.sender === 'user'
                                                    ? 'bg-blue text-white rounded-br-md'
                                                    : 'bg-surface-secondary text-primary rounded-bl-md'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>

                                        {msg.sender === 'ai' && (
                                            <LemonButton
                                                size="xsmall"
                                                type="tertiary"
                                                icon={<IconPlus />}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    e.preventDefault()
                                                    onInsertPromptBlock(msg.text)
                                                    setIsOpen(false)
                                                }}
                                            >
                                                Insert into notebook
                                            </LemonButton>
                                        )}
                                    </div>
                                ))}

                                {isGenerating && (
                                    <div className="flex items-center gap-2 text-xs text-muted py-1">
                                        <ProfilePicture user={{ first_name: activeBot.name }} size="xs" />
                                        <span>
                                            <span className="font-medium text-secondary">{activeBot.name}</span> is
                                            thinking…
                                        </span>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Composer — flat footer, not a second nested box */}
                    <div className="px-3 pt-2 pb-3 mt-1 border-t border-border space-y-2">
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault()
                                    void sendPrompt()
                                }
                            }}
                            placeholder={
                                hasThread
                                    ? `Reply to ${activeBot.name}…`
                                    : `Ask ${activeBot.name} anything…`
                            }
                            rows={3}
                            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none resize-none leading-relaxed min-h-[72px] p-0 border-none shadow-none"
                        />

                        <div className="flex items-center justify-between gap-2">
                            <LemonSelect
                                value={selectedBot}
                                onChange={(val) => {
                                    setSelectedBot(val || 'aria')
                                    setMessages([])
                                }}
                                options={BOT_SELECT_OPTIONS}
                                size="xsmall"
                                type="tertiary"
                                dropdownPlacement="top-start"
                                dropdownMatchSelectWidth={false}
                            />

                            <div className="flex items-center gap-2">
                                <span className="text-muted text-[10px] hidden sm:inline">⌘↵</span>
                                <LemonButton
                                    type="primary"
                                    size="small"
                                    icon={<IconArrowRight />}
                                    onClick={() => void sendPrompt()}
                                    loading={isGenerating}
                                    disabled={!prompt.trim()}
                                    tooltip={`Send to ${activeBot.name}`}
                                >
                                    Send
                                </LemonButton>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            <LemonButton
                type="secondary"
                size="small"
                icon={<IconSparkles className="text-orange" />}
                sideIcon={<IconChevronDown />}
                tooltip="Open AI chat"
            >
                <span className="hidden sm:inline font-medium">Ask AI</span>
            </LemonButton>
        </LemonDropdown>
    )
}
