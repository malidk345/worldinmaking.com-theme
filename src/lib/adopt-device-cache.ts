/**
 * Copy guest (device-key) localStorage JSON onto the signed-in account key.
 * Merge is last-write-wins via the caller-supplied combiner.
 */

export type StorageLike = {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
}

export function readJsonArray(storage: StorageLike, key: string): unknown[] {
    try {
        const raw = storage.getItem(key)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

export function adoptDeviceCacheToAccount<T>(opts: {
    storage: StorageLike
    accountKey: string
    sourceKeys: string[]
    merge: (fromSources: T[], existing: T[]) => T[]
}): T[] {
    const existing = readJsonArray(opts.storage, opts.accountKey) as T[]
    const sources: T[] = []
    const seen = new Set<string>()
    for (const key of opts.sourceKeys) {
        if (!key || key === opts.accountKey || seen.has(key)) continue
        seen.add(key)
        sources.push(...(readJsonArray(opts.storage, key) as T[]))
    }
    if (sources.length === 0) return existing
    const merged = opts.merge(sources, existing)
    try {
        opts.storage.setItem(opts.accountKey, JSON.stringify(merged))
    } catch {
        /* quota — keep what we could */
    }
    return merged
}

export function adoptStringIdLists(opts: {
    storage: StorageLike
    accountKey: string
    sourceKeys: string[]
}): string[] {
    return adoptDeviceCacheToAccount<string>({
        storage: opts.storage,
        accountKey: opts.accountKey,
        sourceKeys: opts.sourceKeys,
        merge: (fromSources, existing) => Array.from(new Set([...fromSources, ...existing].filter((id) => typeof id === 'string'))),
    })
}
