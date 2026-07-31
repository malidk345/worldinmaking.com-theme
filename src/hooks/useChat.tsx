import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { IconX, IconMinus, IconSparkles, IconSend } from '@posthog/icons'
import { useApp } from 'context/App'
import PhilosopherThought from 'components/PhilosopherThought'
import OSButton from 'components/OSButton'

interface ChatContextType {
    hasUnread: boolean
    setHasUnread: (unread: boolean) => void
    loading: boolean
    renderChat: () => void
    setQuickQuestions: (questions: string[]) => void
    conversationHistory: { id: string; question: number; date: string }[]
    resetConversationHistory: () => void
    EmbeddedChat: any
    aiChatSettings: any
    baseSettings: any
    context: { type: 'page'; value: { path: string; label: string } }[]
    setContext: (context: { type: 'page'; value: { path: string; label: string } }[]) => void
    addContext: (newContext: { type: 'page'; value: { path: string; label: string } }) => void
    firstResponse: string | null
    initialQuestion?: string
    codeSnippet?: { code: string; language: string; sourceUrl: string }
    openChat?: () => void
}

const defaultChatContext: ChatContextType = {
    hasUnread: false,
    setHasUnread: () => {},
    loading: false,
    renderChat: () => {},
    setQuickQuestions: () => {},
    conversationHistory: [],
    resetConversationHistory: () => {},
    EmbeddedChat: null,
    aiChatSettings: {},
    baseSettings: {},
    context: [],
    setContext: () => {},
    addContext: () => {},
    firstResponse: null,
    openChat: () => {},
}

const ChatContext = createContext<ChatContextType>(defaultChatContext)

export function ChatProvider({ children }: { children?: React.ReactNode; [key: string]: any }): JSX.Element {
    return <ChatContext.Provider value={defaultChatContext}>{children ?? null}</ChatContext.Provider>
}

interface MessageItem {
    id: string
    sender: 'user' | 'philosopher'
    philosopherName?: string
    thought?: string
    text: string
}

const PHILOSOPHERS = [
    { name: 'Nietzsche', icon: '⚡', stance: 'Will to Power' },
    { name: 'Zizek', icon: '🍿', stance: 'Ideology Critique' },
    { name: 'Spinoza', icon: '💎', stance: 'Rationalist Monism' },
    { name: 'Marx', icon: '🛠️', stance: 'Materialism' },
    { name: 'Heidegger', icon: '📜', stance: 'Enframing & Being' },
]

export function ChatOverlay(): JSX.Element | null {
    const { chatOpen, setChatOpen, chatParams } = useApp()
    const [selectedPhilosopher, setSelectedPhilosopher] = useState('Nietzsche')
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [messages, setMessages] = useState<MessageItem[]>([
        {
            id: 'init-1',
            sender: 'philosopher',
            philosopherName: 'Nietzsche',
            thought: 'Deconstructing modern technological illusions and formulating an existential perspective.',
            text: 'Greetings. Ask me any philosophical or technical dilemma, and I shall evaluate it through the Will to Power.',
        },
    ])
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (chatParams?.initialQuestion && chatOpen) {
            handleSendQuestion(chatParams.initialQuestion)
        }
    }, [chatParams, chatOpen])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    if (!chatOpen) return null

    const handleSendQuestion = async (questionText?: string) => {
        const query = questionText || input
        if (!query.trim() || loading) return

        const userMsg: MessageItem = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: query,
        }
        setMessages((prev) => [...prev, userMsg])
        if (!questionText) setInput('')
        setLoading(true)

        try {
            const res = await fetch('/api/philosopher-bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: query,
                    philosopher: selectedPhilosopher,
                    taskType: 'community_reply',
                }),
            })
            const data = await res.json()

            const botMsg: MessageItem = {
                id: `bot-${Date.now()}`,
                sender: 'philosopher',
                philosopherName: data.philosopher || selectedPhilosopher,
                thought: data.thought || `Analyzing "${query.slice(0, 40)}..." through ${selectedPhilosopher}'s epistemic lens.`,
                text: data.reply || 'Knowledge requires active questioning of underlying premises.',
            }
            setMessages((prev) => [...prev, botMsg])
        } catch (err) {
            console.error('Philosopher AI query error:', err)
        } finally {
            setLoading(false)
        }
    }

    const currentIcon = PHILOSOPHERS.find((p) => p.name === selectedPhilosopher)?.icon || '⚡'

    return (
        <div className="fixed bottom-16 right-4 z-[99999] w-[420px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-100px)] flex flex-col rounded-xl border border-primary/30 bg-primary/95 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-secondary/40 select-none">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{currentIcon}</span>
                    <div>
                        <h3 className="font-bold text-sm leading-none text-primary">Ask {selectedPhilosopher} AI</h3>
                        <p className="text-[11px] text-secondary mt-0.5 font-mono">Live Vercel AI SDK Engine</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <OSButton size="sm" onClick={() => setChatOpen(false)} icon={<IconX />} aria-label="Close chat" />
                </div>
            </div>

            {/* Philosopher Selection Bar */}
            <div className="flex items-center gap-1 p-2 border-b border-primary/10 bg-tertiary/20 overflow-x-auto">
                {PHILOSOPHERS.map((p) => (
                    <button
                        key={p.name}
                        onClick={() => setSelectedPhilosopher(p.name)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            selectedPhilosopher === p.name
                                ? 'bg-accent text-white shadow-sm'
                                : 'bg-primary/40 text-secondary hover:text-primary hover:bg-primary/70'
                        }`}
                    >
                        <span>{p.icon}</span>
                        <span>{p.name}</span>
                    </button>
                ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        {msg.sender === 'philosopher' && (
                            <div className="w-full max-w-[90%] bg-tertiary/50 border border-primary/15 rounded-lg p-3 text-primary shadow-sm">
                                <div className="flex items-center justify-between text-xs font-semibold text-accent mb-1">
                                    <span>@{msg.philosopherName || selectedPhilosopher}</span>
                                </div>
                                <PhilosopherThought thought={msg.thought || ''} philosopherName={msg.philosopherName || selectedPhilosopher} />
                                <p className="leading-relaxed whitespace-pre-wrap text-sm">{msg.text}</p>
                            </div>
                        )}
                        {msg.sender === 'user' && (
                            <div className="max-w-[85%] bg-accent/90 text-white rounded-lg px-3.5 py-2 text-sm shadow">
                                {msg.text}
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="w-full max-w-[90%] bg-tertiary/50 border border-primary/15 rounded-lg p-3 text-primary">
                        <PhilosopherThought thought="" philosopherName={selectedPhilosopher} isLiveThinking={true} />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-primary/20 bg-secondary/30 flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendQuestion()}
                    placeholder={`Ask ${selectedPhilosopher} a question...`}
                    className="flex-1 bg-primary/80 border border-primary/30 rounded-lg px-3 py-2 text-sm text-primary placeholder:text-secondary focus:outline-none focus:border-accent"
                />
                <button
                    onClick={() => handleSendQuestion()}
                    disabled={loading || !input.trim()}
                    className="px-3.5 py-2 bg-accent text-white rounded-lg font-medium text-xs disabled:opacity-50 flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                >
                    <span>Send</span>
                    <IconSend className="size-3.5" />
                </button>
            </div>
        </div>
    )
}

export function useChat(): ChatContextType {
    return useContext(ChatContext)
}
