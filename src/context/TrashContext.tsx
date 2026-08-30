import React, { createContext, useContext, useState, useEffect } from 'react'
import { useToast } from './Toast'

export interface TrashedItemMeta {
    id: string
    url: string
    label: string
    type: 'notebook' | 'app' | 'file'
    trashedAt: string
    note?: string
    data?: any
}

interface TrashContextType {
    trashedItems: TrashedItemMeta[]
    moveToTrash: (item: { url: string; label?: string; type?: 'notebook' | 'app' | 'file'; note?: string; data?: any }) => void
    restoreItem: (idOrUrl: string) => void
    deletePermanently: (idOrUrl: string) => void
    emptyTrash: () => void
    restoreAll: () => void
    addSampleItem: () => void
    isTrashed: (url: string) => boolean
    isHydrated: boolean
}

const STORAGE_KEY = 'wim_os_trashed_items_v2'

const TrashContext = createContext<TrashContextType | undefined>(undefined)

export const TrashProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [trashedItems, setTrashedItems] = useState<TrashedItemMeta[]>([])
    const [isHydrated, setIsHydrated] = useState(false)
    const { addToast } = useToast()

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                setTrashedItems(JSON.parse(saved))
            }
        } catch (e) {
            /* ignore */
        } finally {
            setIsHydrated(true)
        }
    }, [])

    const saveToStorage = (items: TrashedItemMeta[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
        } catch (e) {
            /* ignore */
        }
    }

    const moveToTrash = (item: { url: string; label?: string; type?: 'notebook' | 'app' | 'file'; note?: string; data?: any }) => {
        if (!item.url || item.url === '/trash') return
        setTrashedItems((prev) => {
            if (prev.some((i) => i.url === item.url)) return prev
            const newItem: TrashedItemMeta = {
                id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                url: item.url,
                label: item.label || item.url.replace('/', '') || 'Item',
                type: item.type || 'app',
                trashedAt: new Date().toISOString(),
                note: item.note || '',
                data: item.data,
            }
            const updated = [newItem, ...prev]
            saveToStorage(updated)
            return updated
        })
        addToast({
            description: `Moved "${item.label || item.url}" to Trash`,
            duration: 2500,
        })
    }

    const restoreItem = (idOrUrl: string) => {
        setTrashedItems((prev) => {
            const target = prev.find((i) => i.id === idOrUrl || i.url === idOrUrl)
            const updated = prev.filter((i) => i.id !== idOrUrl && i.url !== idOrUrl)
            saveToStorage(updated)
            if (target) {
                addToast({
                    description: `Restored "${target.label}" to Desktop`,
                    duration: 2500,
                })
            }
            return updated
        })
    }

    const deletePermanently = (idOrUrl: string) => {
        setTrashedItems((prev) => {
            const target = prev.find((i) => i.id === idOrUrl || i.url === idOrUrl)
            const updated = prev.filter((i) => i.id !== idOrUrl && i.url !== idOrUrl)
            saveToStorage(updated)
            if (target) {
                addToast({
                    description: `Permanently deleted "${target.label}"`,
                    duration: 2500,
                })
            }
            return updated
        })
    }

    const emptyTrash = () => {
        setTrashedItems([])
        saveToStorage([])
        addToast({ description: 'Trash emptied permanently.' })
    }

    const restoreAll = () => {
        setTrashedItems([])
        saveToStorage([])
        addToast({ description: 'All items restored to Desktop.' })
    }

    const addSampleItem = () => {
        const samples = [
            { label: 'Draft Note.md', url: `/draft-${Date.now()}`, type: 'file' as const },
            { label: 'Project Roadmap', url: `/notebooks/sample-${Date.now()}`, type: 'notebook' as const },
            { label: 'Legacy App', url: `/app-${Date.now()}`, type: 'app' as const },
        ]
        const sample = samples[Math.floor(Math.random() * samples.length)]
        moveToTrash(sample)
    }

    const isTrashed = (url: string) => {
        if (!isHydrated) return false
        return trashedItems.some((item) => item.url === url)
    }

    return (
        <TrashContext.Provider
            value={{
                trashedItems,
                moveToTrash,
                restoreItem,
                deletePermanently,
                emptyTrash,
                restoreAll,
                addSampleItem,
                isTrashed,
                isHydrated,
            }}
        >
            {children}
        </TrashContext.Provider>
    )
}

export const useTrash = () => {
    const context = useContext(TrashContext)
    if (!context) {
        throw new Error('useTrash must be used within a TrashProvider')
    }
    return context
}
