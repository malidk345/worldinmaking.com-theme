/**
 * Sequential provider-key index that survives `pnpm dev` restarts.
 * Edge isolates without fs fall back to in-memory only.
 *
 * Node builtins are loaded via process.getBuiltinModule (Node 22) so this file
 * stays Edge-webpack-safe — no Function()/eval()/require().
 */
const memoryCursors = new Map<string, number>()

type NodeFs = {
    existsSync: (path: string) => boolean
    readFileSync: (path: string, enc: string) => string
    writeFileSync: (path: string, data: string, enc: string) => void
}
type NodeOs = { tmpdir: () => string }
type NodePath = { join: (...parts: string[]) => string }

function nodeBuiltin<T>(name: string): T | null {
    try {
        if (typeof process === 'undefined') return null
        if (process.env.NEXT_RUNTIME === 'edge') return null
        const getter = (process as NodeJS.Process & { getBuiltinModule?: (id: string) => unknown })
            .getBuiltinModule
        if (typeof getter !== 'function') return null
        return getter(name) as T
    } catch {
        return null
    }
}

function cursorEnvName(family: string): string {
    return `WIM_${family.toUpperCase()}_CURSOR_FILE`
}

function cursorPath(family: string): string | null {
    try {
        if (typeof process !== 'undefined') {
            const override = process.env?.[cursorEnvName(family)]
            if (override) return override
        }
        const os = nodeBuiltin<NodeOs>('os')
        const path = nodeBuiltin<NodePath>('path')
        if (!os || !path) return null
        return path.join(os.tmpdir(), `wim-${family}-key-cursor`)
    } catch {
        return null
    }
}

function readFsCursor(family: string): number | null {
    try {
        const file = cursorPath(family)
        if (!file) return null
        const fs = nodeBuiltin<NodeFs>('fs')
        if (!fs || !fs.existsSync(file)) return null
        const parsed = parseInt(String(fs.readFileSync(file, 'utf8')).trim(), 10)
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
    } catch {
        return null
    }
}

function writeFsCursor(family: string, value: number): void {
    try {
        const file = cursorPath(family)
        if (!file) return
        const fs = nodeBuiltin<NodeFs>('fs')
        if (!fs) return
        fs.writeFileSync(file, String(value), 'utf8')
    } catch {
        /* read-only or edge */
    }
}

/** Returns the start index for this request, then advances for the next one. */
export function nextFamilyKeyStart(family: string, keyCount: number): number {
    if (keyCount <= 1) return 0
    const stored = readFsCursor(family)
    let current: number
    if (stored !== null) {
        current = stored
    } else if (memoryCursors.has(family)) {
        current = memoryCursors.get(family) || 0
    } else {
        // Cloudflare isolates have no shared fs. Pick a random initial start index
        // so concurrent edge cold starts distribute evenly across all keys.
        current = Math.floor(Math.random() * keyCount)
    }
    const start = ((current % keyCount) + keyCount) % keyCount
    const next = (start + 1) % keyCount
    memoryCursors.set(family, next)
    writeFsCursor(family, next)
    return start
}

/** Pin the next `nextFamilyKeyStart` result without consuming it. */
export function setFamilyKeyStart(family: string, start: number): void {
    const value = Number.isFinite(start) && start > 0 ? Math.floor(start) : 0
    memoryCursors.set(family, value)
    writeFsCursor(family, value)
}

export function resetFamilyKeyCursor(family?: string): void {
    if (family) {
        memoryCursors.set(family, 0)
        writeFsCursor(family, 0)
        return
    }
    const families = Array.from(new Set(['groq', 'gemini', 'primary', ...Array.from(memoryCursors.keys())]))
    for (const name of families) {
        memoryCursors.set(name, 0)
        writeFsCursor(name, 0)
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

