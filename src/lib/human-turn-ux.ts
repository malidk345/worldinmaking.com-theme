import type { HumanTurn } from '../components/ClaudeWorkspaceChat/types'

/**
 * Prefer a settled interrupt over a late stream flush / stale remote row that
 * still carries status:"pending". When both sides are settled (or both pending),
 * `preferIncoming` chooses which wins (stream patch / preferRight merge).
 */
export function resolveHumanTurn(
    existing: HumanTurn | undefined,
    incoming: HumanTurn | undefined,
    preferIncoming: boolean = true
): HumanTurn | undefined {
    if (!incoming) return existing
    if (!existing) return incoming
    if (existing.status !== 'pending' && incoming.status === 'pending') return existing
    if (incoming.status !== 'pending' && existing.status === 'pending') return incoming
    return preferIncoming ? incoming : existing
}

/** Composer should offer Answer/Revise even if the interrupt SSE is still draining. */
export function preferHumanAnswerOverStop(isStreaming: boolean, awaitingHuman: boolean): boolean {
    return awaitingHuman || !isStreaming
}
