/**
 * Structured AI-turn telemetry. Never logs secrets or raw prompts.
 *
 * Every turn is written to stdout (structured JSON) and, when PostHog is
 * configured, captured server-side as an `wim_ai_turn` event so latency,
 * provider health, and error rates can be dashboarded. The capture is
 * fire-and-forget and never blocks or fails a request.
 */
import { envFrom, getRuntimeEnv, type EnvStore } from './runtime-env'

export type AiTurnTelemetry = {
    ok: boolean
    stream: boolean
    provider: string
    taskType?: string
    philosopher?: string
    latencyMs: number
    attemptCount: number
    promptChars?: number
    completionChars?: number
    errorCode?: string
    /** Correlates a turn with the HTTP request that produced it. */
    requestId?: string
    qualityGate?: 'passed' | 'failed' | 'skipped'
    interrupted?: boolean
    usedTools?: boolean
}

export function recordAiTurn(event: AiTurnTelemetry): void {
    const payload = buildPayload(event)
    if (event.ok) {
        console.info('[ai-turn]', JSON.stringify(payload))
    } else {
        console.warn('[ai-turn]', JSON.stringify(payload))
    }
    captureAiTurnPosthog(payload)
}

export function estimateChars(parts: Array<string | undefined | null>): number {
    return parts.reduce((sum, part) => sum + (part ? part.length : 0), 0)
}

type AiTurnPayload = ReturnType<typeof buildPayload>
function buildPayload(event: AiTurnTelemetry) {
    return {
        ts: new Date().toISOString(),
        ...event,
        promptChars: event.promptChars ?? 0,
        completionChars: event.completionChars ?? 0,
    }
}

const POSTHOG_CAPTURE_TIMEOUT_MS = 2_000

function captureAiTurnPosthog(payload: AiTurnPayload, env?: EnvStore): void {
    try {
        const store = env ?? getRuntimeEnv()
        const key = envFrom(store, 'NEXT_PUBLIC_POSTHOG_KEY')
        if (!key) return
        const host = (envFrom(store, 'NEXT_PUBLIC_POSTHOG_HOST') || 'https://us.i.posthog.com').replace(/\/+$/, '')

        const body = JSON.stringify({
            api_key: key,
            event: 'wim_ai_turn',
            distinct_id: 'wim-ai-server',
            properties: {
                ...payload,
                $process_person_profile: false,
            },
        })

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), POSTHOG_CAPTURE_TIMEOUT_MS)
        fetch(`${host}/capture/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: controller.signal,
        })
            .catch(() => undefined)
            .finally(() => clearTimeout(timer))
    } catch {
        /* telemetry must never break a request */
    }
}
