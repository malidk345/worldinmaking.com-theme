import type { ChartSpec } from 'lib/ai/chart-artifacts'

export type ModelId = string;

export interface ModelOption {
  id: ModelId
  name: string
  badge: string
  description: string
  supportsThinking: boolean
  speed: string
  initials?: string
  avatarBg?: string
  avatarUrl?: string
}

export type ThinkingBudget = 'minimal' | 'balanced' | 'extended'

export type AgentMode = 'ask' | 'plan' | 'execute'

export type HumanTurn = {
  kind: 'plan_approval' | 'ask_user'
  title: string
  status: 'pending' | 'approved' | 'revised' | 'answered'
  plan?: Array<{ id: string; title: string; status: 'pending' | 'in_progress' | 'completed' }>
  summary?: string
  question?: string
  choices?: string[]
  /** Persisted ask_user answer for history rendering. */
  answer?: string
  /** Persisted plan revise note for history rendering. */
  revisionNote?: string
}

export type AgentCheckpoint = {
  v: 1
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null
    tool_calls?: Array<{
      id: string
      type: 'function'
      function: { name: string; arguments: string }
      thoughtSignature?: string
    }>
    tool_call_id?: string
  }>
  todos: Array<{ id: string; title: string; status: 'pending' | 'in_progress' | 'completed' }>
  scratchpad: Array<{ note: string; source?: string }>
  agentMode: AgentMode
  stepCount: number
  usedTools: boolean
  usedWebSearch: boolean
  interrupt: HumanTurn
}

export interface ThinkingStep {
  id: string
  stepNumber: number
  title: string
  detail: string
  timestampMs?: number
  completed: boolean
  source?: 'model_summary' | 'provider_trace' | 'system_event'
  kind?: 'reasoning' | 'tool' | 'plan' | 'node'
  toolName?: string
  arguments?: string
  result?: string
  status?: 'running' | 'done' | 'error'
}

export interface ThinkingProcess {
  durationSeconds: number
  tokenCount: number
  steps: ThinkingStep[]
  summary?: string
  source?: 'model_summary' | 'provider_trace' | 'system_event' | 'none'
  currentNode?: 'root' | 'tools' | 'synthesis'
}

export type ArtifactType = 'code' | 'html' | 'svg' | 'markdown' | 'react' | 'json' | 'table' | 'mermaid' | 'chart' | 'posthog-analytics' | 'canvas' | 'model3d' | 'simulation'

export type ArtifactOrigin = {
  top: number
  left: number
  width: number
  height: number
  centerY: number
}

export interface Artifact {
  id: string
  identifier?: string
  title: string
  type: ArtifactType
  language?: string
  content: string
  chartSpec?: ChartSpec
  description?: string
  version: number
  createdAt: string
  pending?: boolean
  error?: string
  toolCallId?: string
}

export type WebCitationKind = 'paper' | 'encyclopedia' | 'web'

/**
 * A source shown in the Sources panel. Academic fields are optional so
 * citations stored before they existed (chat_messages.citations jsonb) still render.
 */
export interface WebCitation {
  id: number
  title: string
  url: string
  snippet: string
  source?: string
  kind?: WebCitationKind
  authors?: string[]
  year?: number
  venue?: string
  citationCount?: number
  doi?: string
  oaUrl?: string
  pdfUrl?: string
  /** false = cited in the answer but not verifiable against this turn's sources. */
  verified?: boolean
  /** Real author count when `authors` holds APA's first 19 + last (21+ authors). */
  authorCount?: number
  /** Retracted work — shown with a "Retracted" tag. */
  retracted?: boolean
}

export interface FileAttachment {
  id: string
  name: string
  type: 'image' | 'text' | 'pdf' | 'code' | 'audio'
  size: string
  url?: string
  content?: string
  contentPreview?: string
}

export interface OSActionCard {
  type:
    | 'create_notebook'
    | 'create_forum_topic'
    | 'open_window'
    | 'insert_notebook_block'
    | 'rewrite_notebook_document'
    | 'replace_notebook_selection'
    | 'update_notebook_title'
    | 'manage_windows'
    | 'set_system_appearance'
    | 'annotate_notebook'
    | 'publish_to_forum'
    | 'add_notebook_footnote'
  title: string
  description: string
  payload: {
      title?: string
      content?: string
      path?: string
      notebookId?: string
      action?: string
      target?: string
      left_path?: string
      right_path?: string
      theme?: string
      wallpaper?: string
      reduce_transparency?: boolean
      span_text?: string
      note?: string
      category?: string
      marker?: string
      text?: string
  }
  executed?: boolean
}

export interface ToolTrace {
  id: string
  name: string
  status: 'running' | 'done' | 'error'
  arguments?: string
  result?: string
  detail?: string
  thoughtSignature?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  modelUsed?: ModelId
  thinkingProcess?: ThinkingProcess
  artifacts?: Artifact[]
  toolTrace?: ToolTrace[]
  citations?: WebCitation[]
  attachments?: FileAttachment[]
  isStreaming?: boolean
  isTypingDone?: boolean
  stopped?: boolean
  liked?: boolean | null
  editedFromId?: string
  osAction?: OSActionCard
  /** Coarse gateway tier from SSE done — never raw model ids. */
  provider?: 'groq' | 'gemini' | 'openai'
  humanTurn?: HumanTurn
  errorKind?: 'quota' | 'provider' | 'network' | 'auth' | 'timeout' | 'server'
  /**
   * Soft honesty from SSE done.qualityGate.
   * failed/skipped may still show a reply; never treated as errorKind.
   */
  qualityGate?: 'passed' | 'failed' | 'skipped'
  checkpoint?: AgentCheckpoint
}

export interface ProjectSpace {
  id: string
  name: string
  description: string
  systemPrompt: string
  iconName: string
  color: string
  chatCount: number
  createdAt: string
}

export interface Chat {
  id: string
  title: string
  projectId?: string
  modelId: ModelId
  messages: Message[]
  starred: boolean
  createdAt: string
  updatedAt: string
  thinkingBudget: ThinkingBudget
  webSearchEnabled: boolean
  agentMode?: AgentMode
  activePlan?: Array<{ id: string; title: string; status: 'pending' | 'in_progress' | 'completed' }>
  systemPrompt?: string
  shareToken?: string
  isShared?: boolean
  notebookId?: string
}

export type StylePresetId = 'default' | 'concise' | 'explanatory' | 'code-master' | 'formal' | 'turkish-formal'

export interface StylePreset {
  id: StylePresetId
  name: string
  description: string
  promptSuffix: string
}

export interface UserSettings {
  typewriterSpeed: 'slow' | 'smooth' | 'fast' | 'off'
  defaultThinkingBudget: ThinkingBudget
  defaultModel: ModelId
  autoOpenArtifacts: boolean
  soundEffects: boolean
}
