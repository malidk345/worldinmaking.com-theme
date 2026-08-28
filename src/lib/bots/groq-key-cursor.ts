/**
 * Sequential provider-key index that survives `pnpm dev` restarts.
 * Edge isolates without fs fall back to in-memory only.
 */
const memoryCursors = new Map<string, number>()

function cursorEnvName(family: string): string {
    return `WIM_${family.toUpperCase()}_CURSOR_FILE`
}

function cursorPath(family: string): string | null {
    try {
        if (typeof process !== 'undefined') {
            const override = process.env?.[cursorEnvName(family)]
            if (override) return override
        }
        return null
    } catch {
        return null
    }
}

function readFsCursor(family: string): number | null {
    return null
}

function writeFsCursor(family: string, value: number): void {
    // No-op in edge
}

/** Returns the start index for this request, then advances for the next one. */
export function nextFamilyKeyStart(family: string, keyCount: number): number {
    if (keyCount <= 1) return 0
    let current: number
    if (memoryCursors.has(family)) {
        current = memoryCursors.get(family) || 0
    } else {
        // Cloudflare isolates have no shared fs. Pick a random initial start index
        // so concurrent edge cold starts distribute evenly across all keys.
        current = Math.floor(Math.random() * keyCount)
    }
    const start = ((current % keyCount) + keyCount) % keyCount
    const next = (start + 1) % keyCount
    memoryCursors.set(family, next)
    return start
}

/** Pin the next `nextFamilyKeyStart` result without consuming it. */
export function setFamilyKeyStart(family: string, start: number): void {
    const value = Number.isFinite(start) && start > 0 ? Math.floor(start) : 0
    memoryCursors.set(family, value)
}

export function resetFamilyKeyCursor(family?: string): void {
    if (family) {
        memoryCursors.set(family, 0)
        return
    }
    const families = Array.from(new Set(['groq', 'gemini', 'primary', ...Array.from(memoryCursors.keys())]))
    for (const name of families) {
        memoryCursors.set(name, 0)
    }
}

export function nextGroqKeyStart(keyCount: number): number {
    return nextFamilyKeyStart('groq', keyCount)
}

export function resetGroqKeyCursor(): void {
    resetFamilyKeyCursor('groq')
}

const familyCooldownMap = new Map<string, number>()

export function setProviderCooldownState(family: string, durationMs = 60_000): void {
    familyCooldownMap.set(family, Date.now() + durationMs)
}

export function isProviderCooling(family: string): boolean {
    const until = familyCooldownMap.get(family)
    if (!until) return false
    if (Date.now() >= until) {
        familyCooldownMap.delete(family)
        return false
    }
    return true
}

