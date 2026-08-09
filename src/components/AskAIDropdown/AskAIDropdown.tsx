import React, { useState, useRef, useEffect } from 'react'
import { LemonDropdown } from '../LemonUI/LemonDropdown'
import { LemonButton } from '../LemonUI/LemonButton'
import { LemonSelect } from '../LemonUI/LemonSelect'
import { ProfilePicture } from '../LemonUI/ProfilePicture'
import {
    IconSparkles,
    IconChevronDown,
    IconArrowRight,
    IconTrash,
    IconPlus,
} from '@posthog/icons'

export interface AskAIDropdownProps {
    onInsertPromptBlock: (aiContent: string) => void
}

export interface ChatMessage {
    id: string
    sender: 'user' | 'ai'
    text: string
    timestamp: string
}
}

const BOTS = [
    { value: 'aria', name: 'Aria' },
    { value: 'nova', name: 'Nova' },
    { value: 'rex', name: 'Rex' },
    { value: 'luna', name: 'Luna' },
    { value: 'zed', name: 'Zed' },
    { value: 'sage', name: 'Sage' },
]

const BOT_SELECT_OPTIONS = BOTS.map((bot) => ({
    value: bot.value,
    label: (
        <span className="flex items-center gap-2 text-xs font-medium py-1">
            <ProfilePicture user={{ first_name: bot.name }} size="sm" />
            <span className="font-semibold text-white text-xs">{bot.name}</span>
        </span>
    ),
}))

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
                .slice(-6)
                .map((m) => `${m.sender === 'user' ? 'User' : activeBot.name}: ${m.text}`)
                .join('\n')

            const fullPrompt = conversationContext
                ? `Previous conversation:\n${conversationContext}\n\nUser request: ${text}`
                : text

            let res = await fetch('/api/bots/act', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    bot: activeBot.value,
                    question: fullPrompt,
                    mood: 'calm',
                    taskType: 'paper_section',
                    thinkingDepth: 'standard',
                }),
            })

            if (res.status === 404 || res.status === 405) {
                res = await fetch('/api/philosopher-bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        philosopher: activeBot.value,
                        question: fullPrompt,
                        mood: 'calm',
                        taskType: 'paper_section',
                    }),
                })
            }

            let data: any = null
            try {
                data = await res.json()
            } catch {
                data = null
            }

            const reply =
                (typeof data?.reply === 'string' && data.reply.trim()) ||
                (typeof data?.error === 'string' && data.error) ||
                (res.ok
                    ? `${activeBot.name} could not form a reply. Try again.`
                    : `Request failed (${res.status}). Try again.`)

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: reply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }

            setMessages((prev) => [...prev, aiMsg])
        } catch (error) {
            console.warn('[Ask AI] error:', error)
            const fallbackMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: 'The AI assistant is temporarily unreachable. Please try again.',
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
            placement="bottom-end"
            overlay={
                <div
                    className="w-[1100px] max-w-[96vw] p-3 bg-[#15161b] rounded-xl shadow-2xl text-slate-200 flex flex-col gap-3"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#2c2d38]">
                        <div className="flex items-center gap-2">
                            <ProfilePicture user={{ first_name: activeBot.name }} size="md" />
                            <span className="font-bold text-white text-sm">{activeBot.name}</span>
                        </div>

                        {messages.length > 0 && (
                            <LemonButton
                                size="small"
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
                                        <span>• {msg.timestamp}</span>
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

                                        {/* Insert to Notebook button OUTSIDE speech bubble */}
                                        {msg.sender === 'ai' && (
                                            <div className="self-start mt-0.5">
                                                <LemonButton
                                                    size="small"
                                                    type="secondary"
                                                    icon={<IconPlus />}
                                                    onClick={(e: React.MouseEvent) => {
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

                    {/* Input Container */}
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

                        {/* Controls Row */}
                        <div className="flex items-center justify-between pt-2 mt-1">
                            <LemonSelect<string>
                                value={selectedBot}
                                onChange={(val: string) => {
                                    if (val) setSelectedBot(val)
                                    setMessages([])
                                }}
                                options={BOT_SELECT_OPTIONS}
                                size="small"
                                type="tertiary"
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
                onClick={() => setIsOpen(!isOpen)}
                tooltip="Open AI Chat"
            >
                <span className="hidden sm:inline font-medium">Ask AI</span>
            </LemonButton>
        </LemonDropdown>
    )
}
