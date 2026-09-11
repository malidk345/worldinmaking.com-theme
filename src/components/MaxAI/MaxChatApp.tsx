import React, { useState, useRef, useEffect } from 'react'
import { ContextPanel } from './ContextPanel'
import { MessageItem } from './MessageItem'
import { ChatInput } from './ChatInput'
import { ThinkingProcess } from './ThinkingProcess'
import { Message, ContextItem, ChatMode } from './maxTypes'

interface MaxChatAppProps {
  onClose?: () => void
  onMinimize?: () => void
  onMaximize?: () => void
  isMaximized?: boolean
}

const INITIAL_CONTEXT: ContextItem = {
  id: 'pageview',
  name: '$pageview',
  category: 'event',
  description: 'Tracks when users view pages in your application.',
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'How do I query and analyze $pageview event navigation patterns?',
    timestamp: '18:20',
    contextTag: '$pageview',
    contextTitle: 'Tell me about the $pageview event',
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content:
      'Based on PostHog event definitions, the **$pageview** event captures user navigation paths automatically.\n\nHere is how you query it in HogQL:\n```sql\nSELECT properties.$current_url, count(*) \nFROM events \nWHERE event = \'$pageview\' \nGROUP BY properties.$current_url \nORDER BY count(*) DESC\n```',
    timestamp: '18:20',
    thinkingSteps: [
      {
        id: 'step-1',
        label: 'Parsed telemetry tag ($pageview)',
        detail: 'Matched event schema against PostHog event dictionary',
        status: 'completed',
        durationMs: 90,
        iconType: 'parse',
      },
      {
        id: 'step-2',
        label: 'Evaluated property bindings',
        detail: 'Validated payload properties ($current_url, $pathname, $browser, $os)',
        status: 'completed',
        durationMs: 140,
        iconType: 'database',
      },
      {
        id: 'step-3',
        label: 'Executed Gemini Flash inference',
        detail: 'Generated contextual analysis for event structure',
        status: 'completed',
        durationMs: 190,
        iconType: 'brain',
      },
    ],
    thinkingTimeMs: 420,
  },
]

export function MaxChatApp({
  onClose,
  onMinimize,
  onMaximize,
  isMaximized,
}: MaxChatAppProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false)
  const [attachedContext, setAttachedContext] = useState<ContextItem | null>(INITIAL_CONTEXT)
  const [isLoading, setIsLoading] = useState(false)
  const [activeMode, setActiveMode] = useState<ChatMode>('auto')
  const [liveStepIdx, setLiveStepIdx] = useState<number>(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, liveStepIdx])

  const handleNewChat = () => {
    setMessages([])
    setAttachedContext(null)
  }

  const handleSendMessage = async (text: string, mode: ChatMode, contextTagOverride?: string) => {
    if (text === '/clear') {
      handleNewChat()
      return
    }

    setActiveMode(mode)
    const currentContextTag = contextTagOverride || attachedContext?.name

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text || `Analyze telemetry context for ${currentContextTag}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextTag: currentContextTag,
      contextTitle: currentContextTag ? `Context: ${currentContextTag}` : undefined,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)
    setLiveStepIdx(0)

    const timer1 = setTimeout(() => setLiveStepIdx(1), 400)
    const timer2 = setTimeout(() => setLiveStepIdx(2), 950)
    const timer3 = setTimeout(() => setLiveStepIdx(3), 1600)

    try {
      await new Promise((r) => setTimeout(r, 2100))

      const assistantMessage: Message = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: `Analyzed query **"${text}"** with mode **${mode.toUpperCase()}** and context **${currentContextTag || 'Global Workspace'}**.\n\nHere is the telemetry breakdown and code snippet:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thinkingSteps: [
          {
            id: 'step-1',
            label: 'Parsed user prompt & telemetry tag',
            detail: `Attached context: ${currentContextTag || 'Global workspace'}`,
            status: 'completed',
            durationMs: 90,
            iconType: 'parse',
          },
          {
            id: 'step-2',
            label: 'Evaluated property bindings & schemas',
            detail: 'Validated payload properties against event definitions',
            status: 'completed',
            durationMs: 140,
            iconType: 'database',
          },
          {
            id: 'step-3',
            label: mode === 'search' ? 'Performed Web Search grounding' : 'Executed LLM inference model',
            detail: 'Synthesized contextual output',
            status: 'completed',
            durationMs: 280,
            iconType: mode === 'search' ? 'search' : 'brain',
          },
        ],
        thinkingTimeMs: 510,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: any) {
      console.error('Chat Error:', err)
    } finally {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      setIsLoading(false)
      setLiveStepIdx(0)
    }
  }

  const handleRetryMessage = (messageId: string) => {
    const msgIndex = messages.findIndex((m) => m.id === messageId)
    if (msgIndex <= 0) return
    const previousUserMsg = messages[msgIndex - 1]
    if (previousUserMsg && previousUserMsg.role === 'user') {
      handleSendMessage(previousUserMsg.content, 'auto', previousUserMsg.contextTag)
    }
  }

  const handleFeedback = (messageId: string, type: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: m.feedback === type ? undefined : type } : m))
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#f4f4f3] dark:bg-[#18191c] text-primary font-sans relative select-none">
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 overflow-y-auto font-sans">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onRetry={handleRetryMessage}
            onFeedback={handleFeedback}
          />
        ))}

        {isLoading && (
          <div className="flex flex-col items-start my-3 max-w-2xl mr-auto w-full font-sans">
            <ThinkingProcess
              isLive={true}
              steps={[
                {
                  id: 'live-1',
                  label: 'Parsing user prompt & telemetry tag',
                  detail: attachedContext ? `Attached context: ${attachedContext.name}` : 'Analyzing prompt intent',
                  status: liveStepIdx > 0 ? 'completed' : liveStepIdx === 0 ? 'running' : 'pending',
                  durationMs: liveStepIdx > 0 ? 320 : undefined,
                  iconType: 'parse',
                },
                {
                  id: 'live-2',
                  label: 'Evaluating context & property bindings',
                  detail: 'Scanning event structure and payload schemas',
                  status: liveStepIdx > 1 ? 'completed' : liveStepIdx === 1 ? 'running' : 'pending',
                  durationMs: liveStepIdx > 1 ? 480 : undefined,
                  iconType: 'database',
                },
                {
                  id: 'live-3',
                  label: activeMode === 'search' ? 'Performing Google Search grounding' : 'Executing LLM inference model',
                  detail: activeMode === 'search' ? 'Querying web sources...' : 'Synthesizing response...',
                  status: liveStepIdx > 2 ? 'completed' : liveStepIdx === 2 ? 'running' : 'pending',
                  durationMs: liveStepIdx > 2 ? 650 : undefined,
                  iconType: activeMode === 'search' ? 'search' : 'brain',
                },
                {
                  id: 'live-4',
                  label: 'Verifying output formatting & Markdown syntax',
                  detail: 'Checking formatting and code block syntax',
                  status: liveStepIdx > 3 ? 'completed' : liveStepIdx === 3 ? 'running' : 'pending',
                  durationMs: liveStepIdx > 3 ? 210 : undefined,
                  iconType: 'code',
                },
              ]}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <ChatInput
        onSendMessage={handleSendMessage}
        attachedContext={attachedContext}
        onRemoveContext={() => setAttachedContext(null)}
        onSelectContext={(ctx) => setAttachedContext(ctx)}
        isLoading={isLoading}
      />

      <ContextPanel
        isOpen={isContextPanelOpen}
        onClose={() => setIsContextPanelOpen(false)}
        onAttachContext={(ctx) => setAttachedContext(ctx)}
      />
    </div>
  )
}
