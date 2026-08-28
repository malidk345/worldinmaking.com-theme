/**
 * Local-First IndexedDB Storage & Document Version History — WorldInMaking
 *
 * Provides resilient, offline-first persistence and snapshot-based time-travel versioning
 * for research notebooks and uploaded documents.
 */

export interface DocumentSnapshot {
    id: string
    notebookId: string
    title: string
    content: string
    timestamp: number
    author?: string
    charCount: number
    wordCount: number
    changeSummary?: string
}

const DB_NAME = 'wim_local_first_db'
const DB_VERSION = 1
const STORE_NOTEBOOKS = 'notebooks'
const STORE_SNAPSHOTS = 'snapshots'

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            return reject(new Error('IndexedDB is not supported in this environment'))
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NOTEBOOKS)) {
                db.createObjectStore(STORE_NOTEBOOKS, { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
                const snapStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' })
                snapStore.createIndex('notebookId', 'notebookId', { unique: false })
                snapStore.createIndex('timestamp', 'timestamp', { unique: false })
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Persists notebook state immediately to local IndexedDB.
 */
export async function persistNotebookLocal(id: string, title: string, content: string, extra: Record<string, unknown> = {}): Promise<void> {
    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite')
            const store = tx.objectStore(STORE_NOTEBOOKS)
            store.put({
                id,
                title,
                content,
                updatedAt: Date.now(),
                ...extra,
            })
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
        })
    } catch (e) {
        console.warn('IndexedDB persist fallback:', e)
    }
}

/**
 * Creates a version snapshot for time-travel history.
 */
export async function createDocumentSnapshot(
    notebookId: string,
    title: string,
    content: string,
    changeSummary?: string,
    author = 'You'
): Promise<DocumentSnapshot | null> {
    if (!notebookId || !content) return null

    const words = content.split(/\s+/).filter(Boolean).length
    const snapshot: DocumentSnapshot = {
        id: `snap_${notebookId}_${Date.now()}`,
        notebookId,
        title: title || 'Untitled',
        content,
        timestamp: Date.now(),
        author,
        charCount: content.length,
        wordCount: words,
        changeSummary: changeSummary || 'Automatic version snapshot',
    }

    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite')
            const store = tx.objectStore(STORE_SNAPSHOTS)
            store.put(snapshot)
            tx.oncomplete = () => resolve(snapshot)
            tx.onerror = () => reject(tx.error)
        })
    } catch (e) {
        console.warn('Failed to save document snapshot:', e)
        return snapshot
    }
}

/**
 * Retrieves all version snapshots for a given notebook, sorted newest to oldest.
 */
export async function getDocumentSnapshots(notebookId: string): Promise<DocumentSnapshot[]> {
    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_SNAPSHOTS, 'readonly')
            const store = tx.objectStore(STORE_SNAPSHOTS)
            const index = store.index('notebookId')
            const request = index.getAll(IDBKeyRange.only(notebookId))

            request.onsuccess = () => {
                const list = (request.result || []) as DocumentSnapshot[]
                list.sort((a, b) => b.timestamp - a.timestamp)
                resolve(list)
            }
            request.onerror = () => reject(request.error)
        })
    } catch (e) {
        console.warn('Failed to load snapshots:', e)
        return []
    }
}
