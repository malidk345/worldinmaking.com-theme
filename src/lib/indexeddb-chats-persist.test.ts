// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { _resetChatsPersistQueueForTests, persistChatsLocal, loadChatsLocal } from './indexeddb-storage'

type Row = { id: string; chat: { id: string; title: string }; updatedAt: number }

/**
 * Minimal in-memory IndexedDB stub: one DB, chats store, clear/put/getAll.
 * Enough to prove overlapping persistChatsLocal serialize to last-write-wins.
 */
function installMemoryIdb() {
    const chats = new Map<string, Row>()

    function requestOf<T>(result: T): IDBRequest {
        const req = {
            result,
            error: null as DOMException | null,
            onsuccess: null as ((ev: Event) => void) | null,
            onerror: null as ((ev: Event) => void) | null,
        }
        void Promise.resolve().then(() => req.onsuccess?.(new Event("success")))
        return req as unknown as IDBRequest
    }

    const store = {
        clear: () => {
            chats.clear()
            return requestOf(undefined)
        },
        put: (row: Row) => {
            chats.set(row.id, row)
            return requestOf(row.id)
        },
        getAll: () => requestOf([...chats.values()]),
    }

    const db = {
        objectStoreNames: { contains: (n: string) => n === 'chats' || n === 'notebooks' || n === 'snapshots' },
        createObjectStore: (n: string) => {
            void n
            return { createIndex: () => ({}) }
        },
        transaction: (_names: string | string[], _mode?: IDBTransactionMode) => {
            const tx = {
                objectStore: () => store,
                oncomplete: null as (() => void) | null,
                onerror: null as (() => void) | null,
                error: null as DOMException | null,
            }
            void Promise.resolve().then(() => tx.oncomplete?.())
            return tx
        },
        close: () => {},
    }

    let openDelayMs = 0
    let openCount = 0

    const open = (_name: string, _version?: number) => {
        openCount += 1
        const delay = openCount === 1 ? openDelayMs : 0
        const req = {
            result: db as unknown as IDBDatabase,
            error: null as DOMException | null,
            onsuccess: null as ((ev: Event) => void) | null,
            onerror: null as ((ev: Event) => void) | null,
            onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
        }
        void Promise.resolve().then(async () => {
            if (delay) await new Promise((r) => setTimeout(r, delay))
            req.onupgradeneeded?.({ target: req } as unknown as IDBVersionChangeEvent)
            req.onsuccess?.(new Event('success'))
        })
        return req as unknown as IDBOpenDBRequest
    }

    const localStorage = {
        store: new Map<string, string>(),
        getItem(k: string) {
            return this.store.get(k) ?? null
        },
        setItem(k: string, v: string) {
            this.store.set(k, v)
        },
    }

    vi.stubGlobal('window', { indexedDB: { open }, localStorage })
    vi.stubGlobal('indexedDB', { open })

    return {
        chats,
        setFirstOpenDelay(ms: number) {
            openDelayMs = ms
            openCount = 0
        },
    }
}

describe('persistChatsLocal serialize queue', () => {
    afterEach(() => {
        _resetChatsPersistQueueForTests()
        vi.unstubAllGlobals()
    })

    it('last overlapping snapshot wins when first openDB is slower', async () => {
        const mem = installMemoryIdb()
        mem.setFirstOpenDelay(30)

        const stale = [{ id: 'a', title: 'stale' }]
        const fresh = [
            { id: 'a', title: 'fresh' },
            { id: 'b', title: 'new' },
        ]

        const p1 = persistChatsLocal(stale)
        const p2 = persistChatsLocal(fresh)
        await Promise.all([p1, p2])

        const loaded = await loadChatsLocal<{ id: string; title: string }>()
        expect(loaded.map((c) => c.id).sort()).toEqual(['a', 'b'])
        expect(loaded.find((c) => c.id === 'a')?.title).toBe('fresh')
    })
})
