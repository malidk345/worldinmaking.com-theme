import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useToast } from './Toast'
import { WIM_IDENTITY_EVENT } from '../lib/wim-identity'
import {
    loadArchivedItemsFromStorage,
    saveArchivedItemsToStorage,
    type ArchivedItemMeta,
} from '../lib/archive-storage'

export type { ArchivedItemMeta }
export {
    ARCHIVE_STORAGE_BASE,
    getArchiveStorageKey,
    loadArchivedItemsFromStorage,
    saveArchivedItemsToStorage,
} from '../lib/archive-storage'

interface ArchiveContextType {
    archivedItems: ArchivedItemMeta[]
    archiveApp: (url: string, label?: string, note?: string) => void
    unarchiveApp: (url: string, label?: string) => void
    updateItemNote: (url: string, note: string) => void
    isArchived: (url: string) => boolean
    clearArchive: () => void
    isHydrated: boolean
}

const ArchiveContext = createContext<ArchiveContextType | undefined>(undefined)

export const ArchiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [archivedItems, setArchivedItems] = useState<ArchivedItemMeta[]>([])
    const [isHydrated, setIsHydrated] = useState(false)
    const { addToast } = useToast()

    const hydrateFromStorage = useCallback(() => {
        try {
            setArchivedItems(loadArchivedItemsFromStorage())
        } catch (e) {
            console.error('[ArchiveContext] Failed to load archived items', e)
            setArchivedItems([])
        } finally {
            setIsHydrated(true)
        }
    }, [])

    useEffect(() => {
        hydrateFromStorage()
        if (typeof window === 'undefined') return
        const onIdentity = () => hydrateFromStorage()
        window.addEventListener(WIM_IDENTITY_EVENT, onIdentity)
        return () => window.removeEventListener(WIM_IDENTITY_EVENT, onIdentity)
    }, [hydrateFromStorage])

    const saveToStorage = (items: ArchivedItemMeta[]) => {
        saveArchivedItemsToStorage(items)
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
