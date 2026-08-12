import React, { createContext, useContext, useEffect } from 'react'
import { useApp } from 'context/App'

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

// When chatOpen is true, open the chat window as a managed window in PostHog's OS window system
export function ChatOverlay(): JSX.Element | null {
    return null
}

export function useChat(): ChatContextType {
    return useContext(ChatContext)
}
