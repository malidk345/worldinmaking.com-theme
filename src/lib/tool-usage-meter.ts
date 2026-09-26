/**
 * Per-turn tool-call metering for the weekly token quota (owner rule 2026-09-18:
 * one weekly token bucket; tool calls deduct from it via the flat per-call surcharge in
 * `token-quota.ts`).
 *
 * Counts every tool call the host actually executed this turn, from the same `onTool`
 * stream the user sees:
 * - top-level calls, `task` sub-agent calls (the `task` call itself and each nested read
 *   tool), and the host's own live-web search (`host-search`);
 * - calls that finished `error` (the model spent a round and got a payload back);
 * - cached / shared research results (the model still received the full payload in its
 *   prompt; the cache only saves upstream API calls), so a repeated search is charged.
 * Not counted: `running` events without a finish, sub-agent calls the host refused
 * (never executed, never emitted), and duplicate finish events for the same call id
 * (a call is counted once per `running` → finish cycle). #844's answer recovery runs
 * tools-off, so it adds no tool events.
 */
import { estimateTokens, estimateToolSurchargeTokens } from './token-quota'

export type MeteredToolEvent = {
    id: string
    name: string
    status: 'running' | 'done' | 'error'
    arguments?: string
    result?: string
}

export type ToolUsageMeter = {
    observe(event: MeteredToolEvent): void
    /** Executed tool calls so far. */
    readonly count: number
    /** Tool arguments + results as streamed (already clipped by the pipeline). */
    readonly payloadChars: number
    /** Tokens to add for tools: payload estimate + flat per-call surcharge. */
    tokens(): number
}

export function createToolUsageMeter(): ToolUsageMeter {
    const pending = new Set<string>()
    const settled = new Set<string>()
    let count = 0
    let payload = ''
    let payloadChars = 0
    return {
        observe(event) {
            if (!event || typeof event.id !== 'string') return
            if (event.status === 'running') {
                pending.add(event.id)
                return
            }
            if (event.status !== 'done' && event.status !== 'error') return
            // Same call finishing twice without a new start: count it once.
            if (settled.has(event.id) && !pending.has(event.id)) return
            pending.delete(event.id)
            settled.add(event.id)
            count += 1
            const chunk = `${event.arguments || ''}${event.result || ''}`
            payloadChars += chunk.length
            payload += chunk
        },
        get count() {
            return count
        },
        get payloadChars() {
            return payloadChars
        },
        tokens() {
            if (count === 0) return 0
            return estimateTokens(payload) + estimateToolSurchargeTokens(count)
        },
    }
}
