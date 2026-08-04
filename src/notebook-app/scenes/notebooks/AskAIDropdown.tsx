import { useState, useRef, useEffect } from 'react'
import { LemonDropdown, LemonButton, LemonSelect, ProfilePicture } from '~nb-lib/lemon-ui/index'
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
    { value: 'aria', name: 'Aria' },
    { value: 'nova', name: 'Nova' },
    { value: 'rex', name: 'Rex' },
    { value: 'luna', name: 'Luna' },
    { value: 'zed', name: 'Zed' },
    { value: 'sage', name: 'Sage' },
]

const BOT_SELECT_OPTIONS = [
    {
        options: BOTS.map((bot) => ({
            value: bot.value,
            label: (
                <span className="flex items-center gap-2 text-xs font-medium py-1">
                    <ProfilePicture user={{ first_name: bot.name }} size="sm" />
                    <span className="font-semibold text-white text-xs">{bot.name}</span>
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

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus()
                }
            }, 50)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isGenerating])

    const handleSendPrompt = async () => {
        const text = prompt.trim()
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

            const systemInstructions = `You are a helpful AI assistant named ${activeBot.name}. Answer concisely and accurately using markdown.`

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

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: candidateText ? candidateText.trim() : 'I answered your request above.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }

            setMessages((prev) => [...prev, aiMsg])
        } catch (error) {
            console.warn('AI error:', error)
            const fallbackMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: `Response for: "${text}"`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
            setMessages((prev) => [...prev, fallbackMsg])
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <LemonDropdown
            visible={isOpen}
            onVisibilityChange={(v) => setIsOpen(v)}
            onClickOutside={() => setIsOpen(false)}
            placement="bottom-end"
            overlay={
                <div
                    className="w-[1100px] max-w-[96vw] p-3 bg-[#15161b] rounded-xl shadow-2xl text-slate-200 flex flex-col gap-3"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#2c2d38]">
                        <div className="flex items-center gap-2">
                            <ProfilePicture user={{ first_name: activeBot.name }} size="md" />
                            <span className="font-bold text-white text-sm">{activeBot.name}</span>
                        </div>

                        {messages.length > 0 && (
                            <LemonButton
                                size="xsmall"
                                type="tertiary"
                                icon={<IconTrash />}
                                onClick={() => setMessages([])}
                                tooltip="Clear conversation"
                            >
                                Clear Thread
                            </LemonButton>
                        )}
                    </div>

                    {/* Conversation Thread */}
                    {messages.length > 0 && (
                        <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1 pb-1 text-xs leading-relaxed">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-mono">
                                        {msg.sender === 'ai' ? (
                                            <>
                                                <ProfilePicture user={{ first_name: activeBot.name }} size="xs" />
                                                <span className="font-semibold text-white">
                                                    {activeBot.name}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="font-semibold text-slate-300">You</span>
                                        )}
                                        <span>â€¢ {msg.timestamp}</span>
                                    </div>

                                    {/* Speech Bubble */}
                                    <div className={`flex flex-col gap-1.5 max-w-[92%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div
                                            className={`p-3 rounded-xl border text-slate-100 whitespace-pre-wrap w-full ${
                                                msg.sender === 'user'
                                                    ? 'bg-[#232530] border-[#3b3c4a]'
                                                    : 'bg-[#1a1b23] border-[#2c2d38] shadow-inner'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>

                                        {/* Insert to Notebook button OUTSIDE the speech bubble */}
                                        {msg.sender === 'ai' && (
                                            <div className="self-start mt-0.5">
                                                <LemonButton
                                                    size="xsmall"
                                                    type="secondary"
                                                    icon={<IconPlus />}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        e.preventDefault()
                                                        onInsertPromptBlock(msg.text)
                                                        setIsOpen(false)
                                                    }}
                                                    tooltip="Insert into notebook"
                                                >
                                                    Insert into Notebook
                                                </LemonButton>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isGenerating && (
                                <div className="flex items-center gap-2 text-slate-400 text-xs py-2 italic">
                                    <ProfilePicture user={{ first_name: activeBot.name }} size="xs" />
                                    <span>
                                        <span className="font-semibold text-white">{activeBot.name}</span>
                                        {' is thinking...'}
                                    </span>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    )}

                    {/* Input Container â€” NO inner border-t line */}
                    <div className="relative flex flex-col border border-[#3b3c4a] bg-[#15161b] rounded-xl p-3 focus-within:border-blue-500 shadow-sm transition-colors">
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault()
                                    handleSendPrompt()
                                }
                            }}
                            placeholder={
                                messages.length === 0
                                    ? `Ask ${activeBot.name} anything...`
                                    : `Reply to ${activeBot.name} (Cmd + Enter)...`
                            }
                            rows={4}
                            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed min-h-[110px] p-0 border-none shadow-none"
                        />

                        {/* Controls Row â€” WITHOUT border-t line */}
                        <div className="flex items-center justify-between pt-2 mt-1">
                            <LemonSelect
                                value={selectedBot}
                                onChange={(val) => {
                                    setSelectedBot(val || 'aria')
                                    setMessages([])
                                }}
                                options={BOT_SELECT_OPTIONS}
                                size="small"
                                type="tertiary"
                                dropdownPlacement="top-start"
                                dropdownMatchSelectWidth={false}
                                className="border border-[#2c2d38] bg-[#111216] !py-0.5 !px-2"
                            />

                            <div className="flex items-center gap-2.5">
                                <span className="text-slate-500 text-[10px] hidden sm:inline font-mono">
                                    Cmd + Enter
                                </span>
                                <LemonButton
                                    type="primary"
                                    size="small"
                                    icon={<IconArrowRight />}
                                    onClick={handleSendPrompt}
                                    loading={isGenerating}
                                    disabled={!prompt.trim()}
                                    tooltip={`Send to ${activeBot.name} (Cmd + Enter)`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            <LemonButton
                type="secondary"
                size="small"
                icon={<IconSparkles className="text-amber-500" />}
                sideIcon={<IconChevronDown />}
                tooltip="Open AI Chat"
            >
                <span className="hidden sm:inline font-medium">Ask AI</span>
            </LemonButton>
        </LemonDropdown>
    )
}
