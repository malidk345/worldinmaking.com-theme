/**
 * Structured AI-turn telemetry. Never logs secrets or raw prompts.
 */
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
}

export function recordAiTurn(event: AiTurnTelemetry): void {
    const payload = {
        ts: new Date().toISOString(),
        ...event,
        promptChars: event.promptChars ?? 0,
        completionChars: event.completionChars ?? 0,
    }
    if (event.ok) {
        console.info('[ai-turn]', JSON.stringify(payload))
    } else {
        console.warn('[ai-turn]', JSON.stringify(payload))
    }
}

export function estimateChars(parts: Array<string | undefined | null>): number {
    return parts.reduce((sum, part) => sum + (part ? part.length : 0), 0)
}
