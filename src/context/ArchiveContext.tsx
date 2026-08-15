import React, { createContext, useContext, useState, useEffect } from 'react'
import { useToast } from './Toast'

export interface ArchivedItemMeta {
    url: string
    label: string
    archivedAt: string
    note?: string
    category?: string
}

interface ArchiveContextType {
    archivedItems: ArchivedItemMeta[]
    archiveApp: (url: string, label?: string, note?: string) => void
    unarchiveApp: (url: string, label?: string) => void
    updateItemNote: (url: string, note: string) => void
    isArchived: (url: string) => boolean
    clearArchive: () => void
    isHydrated: boolean
}

const STORAGE_KEY = 'wim_os_archived_items_v2'

const ArchiveContext = createContext<ArchiveContextType | undefined>(undefined)

export const ArchiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [archivedItems, setArchivedItems] = useState<ArchivedItemMeta[]>([])
    const [isHydrated, setIsHydrated] = useState(false)
    const { addToast } = useToast()

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                setArchivedItems(JSON.parse(saved))
            }
        } catch (e) {
            console.error('[ArchiveContext] Failed to load archived items', e)
        } finally {
            setIsHydrated(true)
        }
    }, [])

    const saveToStorage = (items: ArchivedItemMeta[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
        } catch (e) {
            console.error('[ArchiveContext] Failed to save archived items', e)
        }
    }

    const archiveApp = (url: string, label?: string, note?: string) => {
        if (!url || url === '/archive') return // Prevent archiving Archive itself
        setArchivedItems((prev) => {
            if (prev.some((item) => item.url === url)) return prev
            const newItem: ArchivedItemMeta = {
                url,
                label: label || url.replace('/', '') || 'App',
                archivedAt: new Date().toISOString(),
                note: note || '',
            }
            const updated = [newItem, ...prev]
            saveToStorage(updated)
            return updated
        })
        addToast({
            description: `Moved "${label || url}" to Archive`,
            duration: 2500,
        })
    }

    const unarchiveApp = (url: string, label?: string) => {
        setArchivedItems((prev) => {
            const updated = prev.filter((item) => item.url !== url)
            saveToStorage(updated)
            return updated
        })
        addToast({
            description: `Restored "${label || url}" to Desktop`,
            duration: 2500,
        })
    }

    const updateItemNote = (url: string, note: string) => {
        setArchivedItems((prev) => {
            const updated = prev.map((item) => (item.url === url ? { ...item, note } : item))
            saveToStorage(updated)
            return updated
        })
        addToast({ description: 'Archive note saved' })
    }

    const isArchived = (url: string) => {
        if (!isHydrated) return false
        return archivedItems.some((item) => item.url === url)
    }

    const clearArchive = () => {
        setArchivedItems([])
        saveToStorage([])
        addToast({ description: 'Archive cleared. Items restored to Desktop.' })
    }

    return (
        <ArchiveContext.Provider
            value={{
                archivedItems,
                archiveApp,
                unarchiveApp,
                updateItemNote,
                isArchived,
                clearArchive,
                isHydrated,
            }}
        >
            {children}
        </ArchiveContext.Provider>
    )
}

export const useArchive = () => {
    const context = useContext(ArchiveContext)
    if (!context) {
        throw new Error('useArchive must be used within an ArchiveProvider')
    }
    return context
}
