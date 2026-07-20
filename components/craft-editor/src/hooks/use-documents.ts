import { v4 as uuidv4 } from 'uuid'
import { useState, useEffect, useCallback, useMemo } from 'react'

export interface Folder {
  id: string
  name: string
  emoji: string
  createdAt: number
}

export interface Document {
  id: string
  title: string
  content: any
  folderId: string | null
  pinned: boolean
  icon: string
  preview: string
  createdAt: number
  updatedAt: number
  // Publish metadata
  coverImage?: string
  slug?: string
  excerpt?: string
  tags?: string[]
  published?: boolean
  publishedAt?: number | null
}

export type SortOrder = 'updated' | 'created' | 'name'

// Extract plain-text preview from TipTap JSON
function extractPreview(content: any): string {
  if (!content) return ''
  const walk = (node: any): string => {
    if (node?.text) return node.text
    if (node?.content) return node.content.map(walk).join('')
    return ''
  }
  const nodes: any[] = content?.content ?? []
  for (const node of nodes) {
    const text = walk(node).trim()
    if (text) return text.slice(0, 120)
  }
  return ''
}

const DOCS_KEY = 'craft_documents'
const FOLDERS_KEY = 'craft_folders'
const SORT_KEY = 'craft_sort_order'

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [sortOrder, setSortOrderState] = useState<SortOrder>('updated')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const storedDocs = localStorage.getItem(DOCS_KEY)
      const storedFolders = localStorage.getItem(FOLDERS_KEY)
      const storedSort = localStorage.getItem(SORT_KEY) as SortOrder | null

      if (storedFolders) setFolders(JSON.parse(storedFolders))
      if (storedSort) setSortOrderState(storedSort)

      if (storedDocs) {
        const parsed: Document[] = JSON.parse(storedDocs)
        // migrate old docs that don't have new fields
        const migrated = parsed.map(d => ({
          folderId: null, pinned: false, icon: '📄', preview: '',
          ...d,
        }))
        setDocuments(migrated)
        if (migrated.length > 0) setActiveDocId(migrated[0].id)
      } else {
        // Create a welcome document on first launch
        const welcome: Document = {
          id: uuidv4(),
          title: 'Welcome to Craft',
          content: {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'This is a personal, iOS 26-style rich-text editor. Start typing, or type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/' }, { type: 'text', text: ' for commands.' }] },
              { type: 'paragraph', content: [{ type: 'text', text: 'Press ' }, { type: 'text', marks: [{ type: 'code' }], text: '⌘ K' }, { type: 'text', text: ' for the command palette.' }] },
              { type: 'paragraph', content: [{ type: 'text', text: 'Select text to see the floating toolbar, or right-click documents in the sidebar to organize them.' }] },
            ],
          },
          folderId: null, pinned: false, icon: '✨', preview: '',
          createdAt: Date.now(), updatedAt: Date.now(),
        }
        welcome.preview = extractPreview(welcome.content)
        setDocuments([welcome])
        setActiveDocId(welcome.id)
      }
    } catch {}
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) localStorage.setItem(DOCS_KEY, JSON.stringify(documents))
  }, [documents, isLoaded])

  useEffect(() => {
    if (isLoaded) localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
  }, [folders, isLoaded])

  // ── Documents ──────────────────────────────────────
  const createDocument = useCallback((folderId: string | null = null) => {
    const doc: Document = {
      id: uuidv4(), title: 'Untitled', content: '',
      folderId, pinned: false, icon: '📄', preview: '',
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    setDocuments(prev => [doc, ...prev])
    setActiveDocId(doc.id)
    return doc
  }, [])

  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    setDocuments(prev => prev.map(d => {
      if (d.id !== id) return d
      const next = { ...d, ...updates, updatedAt: Date.now() }
      // refresh preview whenever content changes
      if (updates.content !== undefined) next.preview = extractPreview(updates.content)
      return next
    }))
  }, [])

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => {
      const filtered = prev.filter(d => d.id !== id)
      setActiveDocId(aid => aid === id ? (filtered[0]?.id ?? null) : aid)
      return filtered
    })
  }, [])

  const pinDocument = useCallback((id: string, pinned: boolean) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, pinned } : d))
  }, [])

  const moveDocument = useCallback((id: string, folderId: string | null) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, folderId } : d))
  }, [])

  const setDocumentIcon = useCallback((id: string, icon: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, icon } : d))
  }, [])

  // ── Folders ────────────────────────────────────────
  const createFolder = useCallback((name: string, emoji = '📁') => {
    const folder: Folder = { id: uuidv4(), name, emoji, createdAt: Date.now() }
    setFolders(prev => [...prev, folder])
    return folder
  }, [])

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }, [])

  const deleteFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id))
    // move all docs in this folder back to root
    setDocuments(prev => prev.map(d => d.folderId === id ? { ...d, folderId: null } : d))
  }, [])

  // ── Sort ───────────────────────────────────────────
  const setSortOrder = useCallback((order: SortOrder) => {
    setSortOrderState(order)
    localStorage.setItem(SORT_KEY, order)
  }, [])

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      if (sortOrder === 'updated') return b.updatedAt - a.updatedAt
      if (sortOrder === 'created') return b.createdAt - a.createdAt
      if (sortOrder === 'name') return a.title.localeCompare(b.title)
      return 0
    })
  }, [documents, sortOrder])

  return {
    documents: sortedDocuments,
    folders,
    activeDocId,
    setActiveDocId,
    sortOrder,
    setSortOrder,
    createDocument,
    updateDocument,
    deleteDocument,
    pinDocument,
    moveDocument,
    setDocumentIcon,
    createFolder,
    updateFolder,
    deleteFolder,
    isLoaded,
    activeDocument: documents.find(d => d.id === activeDocId) ?? null,
  }
}
