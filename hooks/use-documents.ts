import { useState, useEffect, useCallback } from 'react'
import { supabase } from 'lib/supabase'
import { useAuth } from 'context/AuthContext'
import { useToast } from 'context/ToastContext'
import { toSlug } from 'utils/security'

export interface Folder {
  id: string
  name: string
  emoji: string
  createdAt: number
}

export interface DocumentMeta {
  folderId: string | null
  pinned: boolean
  icon: string
  preview: string
  coverImage?: string
}

export interface Document {
  id: string
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any // TipTap JSON or HTML
  folderId: string | null
  pinned: boolean
  icon: string
  preview: string
  createdAt: number
  updatedAt: number
  coverImage?: string
  slug?: string
  excerpt?: string
  tags?: string[]
  published?: boolean
  publishedAt?: number | null
  category?: string
  image_url?: string
}

export type SortOrder = 'updated' | 'created' | 'name'

// Extract plain-text preview from TipTap JSON
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPreview(content: any): string {
  if (!content) return ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (node: any): string => {
    if (node?.text) return node.text
    if (node?.content) return node.content.map(walk).join('')
    return ''
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodes: any[] = content?.content ?? []
  for (const node of nodes) {
    const text = walk(node).trim()
    if (text) return text.slice(0, 120)
  }
  return ''
}

const FOLDERS_KEY = 'craft_folders'
const SORT_KEY = 'craft_sort_order'
const META_KEY = 'craft_docs_metadata'
const DOCS_KEY = 'craft_documents'

export function useDocuments() {
  const { user, profile, isAdmin } = useAuth()
  const { addToast } = useToast()
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [sortOrder, setSortOrderState] = useState<SortOrder>('updated')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load folders & sort order from localStorage on mount
  useEffect(() => {
    try {
      const storedFolders = localStorage.getItem(FOLDERS_KEY)
      if (storedFolders) setFolders(JSON.parse(storedFolders))

      const storedSort = localStorage.getItem(SORT_KEY) as SortOrder | null
      if (storedSort) setSortOrderState(storedSort)
    } catch (e) {
      console.error('Failed to load local settings:', e)
    }
  }, [])

  // Save folders to localStorage when updated
  const saveFolders = useCallback((newFolders: Folder[]) => {
    setFolders(newFolders)
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(newFolders))
  }, [])

  // Helper to load and save metadata map from/to localStorage
  const getMetadataMap = useCallback((): Record<string, DocumentMeta> => {
    try {
      const stored = localStorage.getItem(META_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }, [])

  const saveMetadataMap = useCallback((map: Record<string, DocumentMeta>) => {
    localStorage.setItem(META_KEY, JSON.stringify(map))
  }, [])

  // Fetch documents from Supabase or load local draft documents
  const loadDocuments = useCallback(async () => {
    if (!user?.id) {
      // Guest mode - load from LocalStorage
      try {
        const storedDocs = localStorage.getItem(DOCS_KEY)
        const metaMap = getMetadataMap()
        
        if (storedDocs) {
          const parsed: Document[] = JSON.parse(storedDocs)
          const mapped = parsed.map(d => {
            const meta = metaMap[d.id] || {}
            return {
              ...d,
              folderId: d.folderId || meta.folderId || null,
              pinned: Boolean(d.pinned || meta.pinned),
              icon: d.icon || meta.icon || 'file-text',
              preview: d.preview || meta.preview || extractPreview(d.content),
              coverImage: d.coverImage || meta.coverImage || undefined,
            }
          })
          setDocuments(mapped)
          
          if (mapped.length > 0 && !activeDocId) {
            let queryDocId = null
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search)
              queryDocId = params.get('postId') || params.get('id')
            }
            if (queryDocId && mapped.some(d => d.id === queryDocId)) {
              setActiveDocId(queryDocId)
            } else {
              setActiveDocId(mapped[0].id)
            }
          }
        } else {
          // Welcome document for guests if no documents exist locally
          const welcomeId = crypto.randomUUID()
          const welcome: Document = {
            id: welcomeId,
            title: 'Welcome to WIM Editor',
            content: {
              type: 'doc',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'You are writing in guest mode. All your notes will be saved locally on your device.' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Start typing, or type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/' }, { type: 'text', text: ' for commands.' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Press ' }, { type: 'text', marks: [{ type: 'code' }], text: '⌘ K' }, { type: 'text', text: ' for the command palette.' }] },
              ],
            },
            folderId: null, pinned: false, icon: 'sparkles', preview: '',
            createdAt: Date.now(), updatedAt: Date.now(),
          }
          welcome.preview = extractPreview(welcome.content)
          setDocuments([welcome])
          setActiveDocId(welcome.id)
        }
      } catch (e) {
        console.error('Failed to load local documents:', e)
      }
      setIsLoaded(true)
      return
    }

    // Member mode - Fetch from Supabase
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, content, excerpt, slug, image_url, category, published, created_at, updated_at')
      .eq('author_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Failed to load posts:', error.message)
      setIsLoaded(true)
      return
    }

    if (data) {
      const metaMap = getMetadataMap()
      const mapped: Document[] = data.map(p => {
        let contentObj = ''
        try {
          contentObj = JSON.parse(p.content)
        } catch {
          contentObj = p.content || ''
        }

        const meta = metaMap[p.id] || {}

        return {
          id: p.id,
          title: p.title || 'Untitled',
          content: contentObj,
          createdAt: new Date(p.created_at).getTime(),
          updatedAt: new Date(p.updated_at).getTime(),
          published: Boolean(p.published),
          slug: p.slug || '',
          category: p.category || 'General',
          image_url: p.image_url || '',
          
          // Merge metadata from localStorage
          folderId: meta.folderId || null,
          pinned: Boolean(meta.pinned),
          icon: meta.icon || 'file-text',
          preview: meta.preview || extractPreview(contentObj),
          coverImage: meta.coverImage || p.image_url || undefined,
          excerpt: p.excerpt || '',
          publishedAt: p.published ? new Date(p.updated_at).getTime() : null,
        }
      })

      setDocuments(mapped)
      if (mapped.length > 0 && !activeDocId) {
        let queryDocId = null
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          queryDocId = params.get('postId') || params.get('id')
        }
        if (queryDocId && mapped.some(d => d.id === queryDocId)) {
          setActiveDocId(queryDocId)
        } else {
          setActiveDocId(mapped[0].id)
        }
      }
    }
    setIsLoaded(true)
  }, [user?.id, activeDocId, getMetadataMap])

  useEffect(() => {
    loadDocuments()
  }, [user?.id, loadDocuments])

  // Save documents to localStorage automatically when updating in local mode
  useEffect(() => {
    if (isLoaded && !user?.id) {
      localStorage.setItem(DOCS_KEY, JSON.stringify(documents))
    }
  }, [documents, isLoaded, user?.id])

  // Create new draft
  const createDocument = useCallback(async (folderId: string | null = null) => {
    const newId = crypto.randomUUID()
    const newDoc: Document = {
      id: newId,
      title: 'Untitled',
      content: { type: 'doc', content: [] },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      published: false,
      slug: 'untitled-' + Math.floor(Math.random() * 100000),
      category: 'General',
      image_url: '',
      folderId,
      pinned: false,
      icon: 'file-text',
      preview: '',
    }

    // Save metadata locally
    const metaMap = getMetadataMap()
    metaMap[newId] = {
      folderId,
      pinned: false,
      icon: 'file-text',
      preview: '',
      coverImage: undefined
    }
    saveMetadataMap(metaMap)

    if (!user?.id) {
      // Local mode
      setDocuments(prev => [newDoc, ...prev])
      setActiveDocId(newDoc.id)
      addToast('New local draft created', 'success')
      return newDoc
    }

    // Supabase mode
    if (!profile?.username) {
      addToast('Missing profile name to sync draft', 'error')
      return null
    }

    const { error } = await supabase
      .from('posts')
      .insert({
        id: newDoc.id,
        title: newDoc.title,
        slug: newDoc.slug,
        content: JSON.stringify({ type: 'doc', content: [] }),
        excerpt: '',
        category: newDoc.category,
        published: newDoc.published,
        author: profile.username,
        author_avatar: profile.avatar_url || '',
        is_approved: isAdmin,
        author_id: user.id,
      })

    if (error) {
      addToast(`Failed to create post: ${error.message}`, 'error')
      return null
    }

    setDocuments(prev => [newDoc, ...prev])
    setActiveDocId(newDoc.id)
    addToast('New draft created on server', 'success')
    return newDoc
  }, [user, profile, isAdmin, addToast, getMetadataMap, saveMetadataMap])

  // Sync state to Supabase
  const syncToSupabase = useCallback(async (doc: Document) => {
    if (!user?.id) return

    // Use coverImage as image_url or extract first image url from content if exists
    let extractedImage = doc.coverImage || doc.image_url || ''
    const content = doc.content
    if (!extractedImage && content) {
      if (typeof content === 'string') {
        const match = content.match(/<img[^>]+src="([^">]+)"/)
        if (match) extractedImage = match[1]
      } else if (typeof content === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const findImage = (node: any): string => {
          if (node.type === 'image' && node.attrs?.src) return node.attrs.src
          if (node.content && Array.isArray(node.content)) {
            for (const child of node.content) {
              const src = findImage(child)
              if (src) return src
            }
          }
          return ''
        }
        extractedImage = findImage(content)
      }
    }

    const finalSlug = doc.slug || toSlug(doc.title)
    const rawContent = typeof doc.content === 'object' ? JSON.stringify(doc.content) : (doc.content || '{"type":"doc","content":[]}')

    const { error } = await supabase
      .from('posts')
      .update({
        title: doc.title,
        slug: finalSlug,
        content: rawContent || '{"type":"doc","content":[]}',
        excerpt: doc.title || '',
        image_url: extractedImage || null,
        published: doc.published ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doc.id)

    if (error) {
      console.error('Failed to sync changes with Supabase:', error.message)
    }
  }, [user?.id])

  // Update existing document
  const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
    setDocuments(prev =>
      prev.map(doc => {
        if (doc.id === id) {
          const nextPreview = updates.content !== undefined ? extractPreview(updates.content) : (updates.preview !== undefined ? updates.preview : doc.preview)
          const updated = { ...doc, ...updates, preview: nextPreview, updatedAt: Date.now() }
          
          // Update metadata map locally
          const metaMap = getMetadataMap()
          metaMap[id] = {
            ...metaMap[id],
            folderId: updated.folderId,
            pinned: updated.pinned,
            icon: updated.icon,
            preview: nextPreview,
            coverImage: updated.coverImage
          }
          saveMetadataMap(metaMap)

          // Sync to database if logged in
          if (user?.id) {
            syncToSupabase(updated)
          }
          
          return updated
        }
        return doc
      })
    )
  }, [user?.id, getMetadataMap, saveMetadataMap, syncToSupabase])

  // Delete document
  const deleteDocument = useCallback(async (id: string) => {
    // Clean up metadata locally
    const metaMap = getMetadataMap()
    delete metaMap[id]
    saveMetadataMap(metaMap)

    if (!user?.id) {
      // Local delete
      setDocuments(prev => {
        const filtered = prev.filter(d => d.id !== id)
        if (activeDocId === id) {
          setActiveDocId(filtered.length > 0 ? filtered[0].id : null)
        }
        return filtered
      })
      addToast('Local post deleted', 'success')
      return
    }

    // Database delete
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) {
      addToast(`Failed to delete post: ${error.message}`, 'error')
      return
    }

    setDocuments(prev => {
      const filtered = prev.filter(d => d.id !== id)
      if (activeDocId === id) {
        setActiveDocId(filtered.length > 0 ? filtered[0].id : null)
      }
      return filtered
    })
    addToast('Post deleted from server', 'success')
  }, [activeDocId, addToast, getMetadataMap, saveMetadataMap, user?.id])

  // Pin document
  const pinDocument = useCallback((id: string, pinned: boolean) => {
    updateDocument(id, { pinned })
  }, [updateDocument])

  // Move document to folder
  const moveDocument = useCallback((id: string, folderId: string | null) => {
    updateDocument(id, { folderId })
  }, [updateDocument])

  // Set document icon
  const setDocumentIcon = useCallback((id: string, icon: string) => {
    updateDocument(id, { icon })
  }, [updateDocument])

  // ── Folders ────────────────────────────────────────
  const createFolder = useCallback((name: string, emoji = 'folder') => {
    const folder: Folder = { id: crypto.randomUUID(), name, emoji, createdAt: Date.now() }
    const newFolders = [...folders, folder]
    saveFolders(newFolders)
    return folder
  }, [folders, saveFolders])

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    const newFolders = folders.map(f => f.id === id ? { ...f, ...updates } : f)
    saveFolders(newFolders)
  }, [folders, saveFolders])

  const deleteFolder = useCallback((id: string) => {
    const newFolders = folders.filter(f => f.id !== id)
    saveFolders(newFolders)
    
    // Move all docs in this folder back to root in state & metadata
    setDocuments(prev =>
      prev.map(d => {
        if (d.folderId === id) {
          const updated = { ...d, folderId: null }
          
          // Update metadata map locally
          const metaMap = getMetadataMap()
          if (metaMap[d.id]) {
            metaMap[d.id].folderId = null
          }
          saveMetadataMap(metaMap)
          
          return updated
        }
        return d
      })
    )
  }, [folders, saveFolders, getMetadataMap, saveMetadataMap])

  // ── Sort ───────────────────────────────────────────
  const setSortOrder = useCallback((order: SortOrder) => {
    setSortOrderState(order)
    localStorage.setItem(SORT_KEY, order)
  }, [])

  const sortedDocuments = [...documents].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (sortOrder === 'updated') return b.updatedAt - a.updatedAt
    if (sortOrder === 'created') return b.createdAt - a.createdAt
    if (sortOrder === 'name') return a.title.localeCompare(b.title)
    return 0
  })

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
    activeDocument: documents.find(d => d.id === activeDocId) || null,
  }
}
