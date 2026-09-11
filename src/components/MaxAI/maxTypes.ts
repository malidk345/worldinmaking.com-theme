export interface ThinkingStep {
  id: string
  label: string
  detail?: string
  status: 'pending' | 'running' | 'completed' | 'done'
  durationMs?: number
  iconType?: 'parse' | 'database' | 'search' | 'code' | 'brain' | 'terminal'
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  contextTag?: string
  contextTitle?: string
  thinkingSteps?: ThinkingStep[]
  thinkingTimeMs?: number
  sources?: { title: string; uri: string }[]
  feedback?: 'up' | 'down'
  rawPayload?: Record<string, any>
}

export interface ContextItem {
  id: string
  name: string
  category: 'event' | 'property' | 'person' | 'doc'
  description: string
  samplePayload?: Record<string, any>
}

export type ChatMode = 'auto' | 'search' | 'analytics' | 'fast'

export interface ReasoningStep {
  id: string
  label: string
  detail?: string
  status?: 'done' | 'running' | 'pending'
}

export interface HumanMessage {
  id: string
  role: 'user'
  content: string
  timestamp?: string
}

export interface AssistantMessage {
  id: string
  role: 'assistant'
  content: string
  timestamp?: string
  thinkingSteps?: ReasoningStep[]
}

export interface FailureMessage {
  id: string
  role: 'failure'
  content: string
  timestamp?: string
}

export type ThreadMessage = HumanMessage | AssistantMessage | FailureMessage

export type PhilosopherKey = 'nietzsche' | 'zizek' | 'foucault' | 'deleuze' | 'byung'

export interface PhilosopherPersona {
  key: PhilosopherKey
  name: string
  avatar: string
  tagline: string
  color: string
}

export const PHILOSOPHER_PERSONAS: PhilosopherPersona[] = [
  {
    key: 'nietzsche',
    name: 'Friedrich Nietzsche',
    avatar: '⚡',
    tagline: 'Will to Power & Revaluation of Values',
    color: '#F59E0B',
  },
  {
    key: 'zizek',
    name: 'Slavoj Žižek',
    avatar: '👓',
    tagline: 'Ideological Critique & Psychoanalysis',
    color: '#EF4444',
  },
  {
    key: 'foucault',
    name: 'Michel Foucault',
    avatar: '🏛️',
    tagline: 'Power/Knowledge & Biopolitics',
    color: '#3B82F6',
  },
  {
    key: 'deleuze',
    name: 'Gilles Deleuze',
    avatar: '🌀',
    tagline: 'Rhizomatic Thinking & Assemblages',
    color: '#10B981',
  },
  {
    key: 'byung',
    name: 'Byung-Chul Han',
    avatar: '🕯️',
    tagline: 'Burnout Society & Transparency',
    color: '#8B5CF6',
  },
]

export interface MaxAIChatProps {
  onClose?: () => void
  initialQuestion?: string
  context?: { type: 'page'; value: { path: string; label: string } }[]
  onSubmit?: (query: string) => void
}
