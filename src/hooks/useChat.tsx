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

import { PostHogAIApp } from 'components/posthog-ui-gallery/src/scenes/PostHogAIApp'

export function ChatOverlay(): JSX.Element | null {
    const { chatOpen, setChatOpen } = useApp()

    if (!chatOpen) return null

    return (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[960px] max-h-[90vh] bg-primary rounded-xl overflow-hidden shadow-2xl flex flex-col relative">
                <button
                    onClick={() => setChatOpen(false)}
                    className="absolute top-3 right-3 z-50 p-2 rounded-full bg-secondary/80 hover:bg-secondary text-primary transition-all shadow"
                    aria-label="Close Ask AI"
                >
                    <IconX className="size-5" />
                </button>
                <div className="flex-1 overflow-y-auto">
                    <PostHogAIApp onBack={() => setChatOpen(false)} />
                </div>
            </div>
        </div>
    )
}

export function useChat(): ChatContextType {
    return useContext(ChatContext)
}
