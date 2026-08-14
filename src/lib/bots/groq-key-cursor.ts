/**
 * Sequential Groq key index that survives `pnpm dev` restarts.
 * Edge isolates without fs fall back to in-memory only.
 */
let memoryCursor = 0

function cursorPath(): string | null {
    try {
        if (typeof process !== 'undefined' && process.env?.WIM_GROQ_CURSOR_FILE) {
            return process.env.WIM_GROQ_CURSOR_FILE
        }
        const req = Function('return typeof require === "function" ? require : null')() as
            | ((id: string) => any)
            | null
        if (!req) return null
        const os = req('os')
        const path = req('path')
        return path.join(os.tmpdir(), 'wim-groq-key-cursor')
    } catch {
        return null
    }
}

function readFsCursor(): number | null {
    try {
        const file = cursorPath()
        if (!file) return null
        const req = Function('return typeof require === "function" ? require : null')() as
            | ((id: string) => any)
            | null
        if (!req) return null
        const fs = req('fs')
        if (!fs.existsSync(file)) return null
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
        const req = Function('return typeof require === "function" ? require : null')() as
            | ((id: string) => any)
            | null
        if (!req) return
        req('fs').writeFileSync(file, String(value), 'utf8')
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
