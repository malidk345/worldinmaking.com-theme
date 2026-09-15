/**
 * Pure Diff/Patch apply for Ask AI Diff cards.
 * Fail-closed: never append when the removed span cannot be uniquely located.
 */

export type NotebookPatchInput = {
    removed?: string
    added?: string
    spanText?: string
}

export type NotebookPatchResult =
    | { ok: true; next: string; mode: 'span' | 'removed' }
    | { ok: false; error: string }

export type UniqueMatchResult =
    | { kind: 'unique'; index: number }
    | { kind: 'none' }
    | { kind: 'ambiguous' }

/** Locate a unique occurrence of needle in haystack (Diff Apply parity). */
export function findUniqueMatch(haystack: string, needle: string): UniqueMatchResult {
    if (!needle) return { kind: 'none' }
    const first = haystack.indexOf(needle)
    if (first === -1) return { kind: 'none' }
    const last = haystack.lastIndexOf(needle)
    if (first !== last) return { kind: 'ambiguous' }
    return { kind: 'unique', index: first }
}

/** Index of a unique match, or null if missing/ambiguous. */
export function uniqueIndex(haystack: string, needle: string): number | null {
    const match = findUniqueMatch(haystack, needle)
    return match.kind === 'unique' ? match.index : null
}

export function applyNotebookPatchText(current: string, input: NotebookPatchInput): NotebookPatchResult {
    const source = current ?? ''
    const added = (input.added ?? '').trim()
    const spanText = (input.spanText ?? '').trim()
    const removed = (input.removed ?? '').trim()

    if (spanText) {
        const match = findUniqueMatch(source, spanText)
        if (match.kind === 'unique') {
            return {
                ok: true,
                next: source.substring(0, match.index) + added + source.substring(match.index + spanText.length),
                mode: 'span',
            }
        }
        // Ambiguous sticky/selection must fail-closed — never apply removed elsewhere.
        if (match.kind === 'ambiguous') {
            return {
                ok: false,
                error: 'Selection matches more than once in the document. Patch failed.',
            }
        }
        // Missing span (stale sticky) — fall through to removed-block match
    }

    if (removed) {
        const idx = uniqueIndex(source, removed)
        if (idx !== null) {
            return {
                ok: true,
                next: source.substring(0, idx) + added + source.substring(idx + removed.length),
                mode: 'removed',
            }
        }
        return {
            ok: false,
            error: 'Could not uniquely find the block in the document. Patch failed.',
        }
    }

    return {
        ok: false,
        error: 'Patch failed: No removed text found to match.',
    }
}
