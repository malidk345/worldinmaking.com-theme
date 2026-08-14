/**
 * Comma-separated search API key helpers. Kept free of runtime-env so unit
 * tests do not import @cloudflare/next-on-pages.
 */

export function collectApiKeys(...rawValues: Array<string | undefined>): string[] {
    const seen = new Set<string>()
    const keys: string[] = []
    for (const raw of rawValues) {
        const pieces = (raw || '')
            .split(/[,;\n\r]+/)
            .map((item) => item.trim().replace(/^['"]+|['"]+$/g, ''))
            .filter(Boolean)
        for (const key of pieces) {
            if (seen.has(key)) continue
            seen.add(key)
            keys.push(key)
        }
    }
    return keys
}

export function rotateKeys(keys: string[], start: number): string[] {
    if (keys.length <= 1) return keys
    const i = ((start % keys.length) + keys.length) % keys.length
    return keys.slice(i).concat(keys.slice(0, i))
}
