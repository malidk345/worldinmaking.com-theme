import type { ChartSpec } from './chart-artifacts'
import { scrubSecretMaterial } from './scrub'

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
    kind?: 'reasoning' | 'tool' | 'plan' | 'node'
    toolName?: string
    arguments?: string
    result?: string
    status?: 'running' | 'done' | 'error'
}

export type AiLifecyclePhase = 'context' | 'generation' | 'quality_gate' | 'persistence'
export type AiLifecycleStatus = 'started' | 'completed' | 'failed'

/**
 * Coarse gateway tier safe for public SSE / inquiry timeline.
 * Never includes model ids, key fingerprints, or BYOK vendor detail.
 */
export type AiPublicProvider = 'groq' | 'gemini' | 'openai'

/** Map an internal GatewayProvider (or similar) to a public coarse label. */
export function toPublicProviderLabel(provider: unknown): AiPublicProvider | undefined {
    if (typeof provider !== 'string') return undefined
    const p = provider.trim().toLowerCase()
    if (!p || p === 'none') return undefined
    if (p.startsWith('groq')) return 'groq'
    if (p.startsWith('gemini')) return 'gemini'
    if (p.startsWith('openai')) return 'openai'
    return undefined
}

export interface AiLifecycleEvent {
    phase: AiLifecyclePhase
    status: AiLifecycleStatus
    detail?: string
    /** Coarse gateway tier for timeline labels — never raw model ids. */
    provider?: AiPublicProvider
}

export interface AiCitation {
    id: number
    title: string
    url: string
    snippet: string
    source?: string
}

export type AiArtifactType = 'code' | 'html' | 'svg' | 'markdown' | 'react' | 'json' | 'table' | 'mermaid' | 'chart' | 'posthog-analytics'

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
          type: 'node'
          node: {
              name: 'root' | 'tools' | 'synthesis'
              status: 'started' | 'completed'
              detail?: string
          }
      }
    | {
          type: 'mode'
          mode: 'ask' | 'plan' | 'execute'
      }
    | {
          type: 'human'
          human: {
              kind: 'plan_approval'
              title: string
              status: 'pending' | 'answered' | 'approved' | 'revised'
              plan?: Array<{ id: string; title: string; status: 'pending' | 'in_progress' | 'completed' }>
              summary?: string
          }
      }
    | {
          type: 'checkpoint'
          checkpoint: import('../bots/agent/checkpoint').AgentCheckpoint
      }
    | {
          type: 'activity'
          activity: {
              seq: number
              kind: 'node' | 'thought' | 'tool' | 'plan'
              id: string
              status: 'running' | 'done' | 'error'
              title?: string
              delta?: string
              detail?: string
              toolName?: string
              arguments?: string
              result?: string
              node?: 'root' | 'tools' | 'synthesis'
          }
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
          type: 'token_usage'
          snapshot: {
              subject: string
              tier: string
              usedTokens: number
              limitTokens: number
              remainingTokens: number
              percentage: number
              allowed: boolean
              resetAtUtc: string
          }
      }
    | {
          type: 'done'
          fullText: string
          /** Coarse gateway tier — never raw model ids or BYOK detail. */
          provider?: AiPublicProvider
          artifacts?: AiArtifact[]
          latencyMs?: number
          attemptCount?: number
          /** True when quality-gate (or finalize) changed the public reply vs live streamed tokens. */
          corrected?: boolean
          /**
           * Soft honesty flag for Ask AI timeline.
           * failed = gate flagged issues but reply may still be shown;
           * skipped = checker unavailable / interrupt short-circuit (not a hard failure).
           */
          qualityGate?: 'passed' | 'failed' | 'skipped'
      }
    | {
          type: 'error'
          code: string
          message: string
          retryable?: boolean
      }

/** Deep-walk an SSE payload and scrub every string leaf before wire serialize. */
export function scrubAiSsePayload<T>(value: T): T {
    return scrubJsonValue(value) as T
}

function scrubJsonValue(value: unknown): unknown {
    if (typeof value === 'string') return scrubSecretMaterial(value)
    if (value === null || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map(scrubJsonValue)
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        out[key] = scrubJsonValue(child)
    }
    return out
}

export function formatAiSseEvent(event: AiSseEvent): string {
    return `data: ${JSON.stringify(scrubAiSsePayload(event))}\n\n`
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