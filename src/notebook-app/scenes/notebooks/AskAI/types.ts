/**
 * Shared TypeScript types for the AskAI chat panel.
 */

export interface AskAIDropdownProps {
    onInsertPromptBlock: (initialPrompt?: string, mode?: 'append' | 'replace' | 'prepend') => void
    currentNotebookContent?: string
}

export interface ThinkingStageView {
    id: string
    label: string
    text: string
}

export interface OSActionCard {
    type: 'create_notebook' | 'create_forum_topic' | 'open_window'
    title: string
    description: string
    payload: {
        title?: string
        content?: string
        path?: string
    }
    executed?: boolean
}

export interface ChatMessage {
    id: string
    sender: 'user' | 'ai' | 'system'
    text: string
    timestamp: string
    philosopherId?: string
    thought?: string
    thinkingStages?: ThinkingStageView[]
    reasoningSteps?: string[]
    suggestions?: string[]
    latencyMs?: number
    hasTable?: boolean
    isStreaming?: boolean
    osAction?: OSActionCard
}
