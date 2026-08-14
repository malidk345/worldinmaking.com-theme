/**
 * Sequential Groq key index that survives `pnpm dev` restarts.
 * Edge isolates without fs fall back to in-memory only.
 *
 * Node builtins are loaded via process.getBuiltinModule (Node 22) so this file
 * stays Edge-webpack-safe — no Function()/eval()/require().
 */
let memoryCursor = 0

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

function cursorPath(): string | null {
    try {
        if (typeof process !== 'undefined' && process.env?.WIM_GROQ_CURSOR_FILE) {
            return process.env.WIM_GROQ_CURSOR_FILE
        }
        const os = nodeBuiltin<NodeOs>('os')
        const path = nodeBuiltin<NodePath>('path')
        if (!os || !path) return null
        return path.join(os.tmpdir(), 'wim-groq-key-cursor')
    } catch {
        return null
    }
}

function readFsCursor(): number | null {
    try {
        const file = cursorPath()
        if (!file) return null
        const fs = nodeBuiltin<NodeFs>('fs')
        if (!fs || !fs.existsSync(file)) return null
        const parsed = parseInt(String(fs.readFileSync(file, 'utf8')).trim(), 10)
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
    } catch {
        return null
    }
}

function writeFsCursor(value: number): void {
    try {
        const file = cursorPath()
        if (!file) return
        const fs = nodeBuiltin<NodeFs>('fs')
        if (!fs) return
        fs.writeFileSync(file, String(value), 'utf8')
    } catch {
        /* read-only or edge */
    }
}

/** Returns the start index for this request, then advances for the next one. */
export function nextGroqKeyStart(keyCount: number): number {
    if (keyCount <= 1) return 0
    const stored = readFsCursor()
    const current = stored === null ? memoryCursor : stored
    const start = ((current % keyCount) + keyCount) % keyCount
    const next = (start + 1) % keyCount
    memoryCursor = next
    writeFsCursor(next)
    return start
}

export function resetGroqKeyCursor(): void {
    memoryCursor = 0
    writeFsCursor(0)
}
