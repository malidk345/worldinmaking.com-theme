import type { ChartSpec } from './chart-artifacts'

/**
 * Shared wire contract for every AI streaming surface.
 *
 * Keep this transport-only: UI-specific types belong to the consuming app.
 * Every event is data-only SSE so browser, edge, and node handlers use the
 * same parser and no endpoint has to maintain a second event vocabulary.
 */

export interface AiThinkingStep {
    id: string
    stepNumber: number
    title: string
    detail: string
    completed: boolean
    source?: 'model_summary' | 'provider_trace' | 'system_event'
}

export type AiLifecyclePhase = 'context' | 'generation' | 'quality_gate' | 'persistence'
export type AiLifecycleStatus = 'started' | 'completed' | 'failed'

export interface AiLifecycleEvent {
    phase: AiLifecyclePhase
    status: AiLifecycleStatus
    detail?: string
    provider?: string
}

export interface AiCitation {
    id: number
    title: string
    url: string
    snippet: string
    source?: string
}

export type AiArtifactType = 'posthog-analytics' | 'code' | 'html' | 'svg' | 'markdown' | 'react' | 'json' | 'table' | 'mermaid' | 'chart'

export interface AiArtifact {
    id: string
    identifier?: string
    title: string
    type: AiArtifactType
    language?: string
    content: string
    chartSpec?: ChartSpec
    description?: string
    version: number
    createdAt: string
}

export type AiSseEvent =
    | {
          type: 'thinking_start'
          durationSeconds?: number
          tokenCount?: number
      }
    | {
          type: 'thinking_step'
          step: AiThinkingStep
      }
    | {
          type: 'search'
          search: {
              status: 'running' | 'done' | 'error'
              query: string
              results?: string | null
          }
      }
    | {
          type: 'tool'
          tool: {
              id: string
              name: string
              status: 'running' | 'done' | 'error'
              detail?: string
              arguments?: string
              result?: string
              thoughtSignature?: string
          }
      }
    | {
          type: 'token'
          text: string
      }
    | {
          type: 'phase'
          phase: AiLifecycleEvent
      }
    | {
          type: 'citations'
          citations: AiCitation[]
      }
    | {
          type: 'artifacts'
          artifacts: AiArtifact[]
      }
    | {
          type: 'action'
          action: import('../bots/tools/host').HostOsAction
      }
    | {
          type: 'done'
          fullText: string
          provider?: string
          artifacts?: AiArtifact[]
          latencyMs?: number
          attemptCount?: number
      }
    | {
          type: 'error'
          code: string
          message: string
          retryable?: boolean
      }

export function formatAiSseEvent(event: AiSseEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`
}

/** Parse one complete SSE frame. Incomplete frames return null. */
export function parseAiSseEvent(frame: string): AiSseEvent | null {
    const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n')

    if (!data) return null

    try {
        const parsed = JSON.parse(data) as Partial<AiSseEvent>
        return typeof parsed.type === 'string' ? (parsed as AiSseEvent) : null
    } catch {
        return null
    }
}
