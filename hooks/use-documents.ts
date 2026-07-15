import { useState, useEffect, useCallback } from 'react'
import { supabase } from 'lib/supabase'
import { useAuth } from 'context/AuthContext'
import { useToast } from 'context/ToastContext'
import { toSlug } from 'utils/security'

export interface Document {
  id: string
  title: string
  content: any // TipTap JSON or HTML
  createdAt: number
  updatedAt: number
  published?: boolean
  slug?: string
  category?: string
  image_url?: string
}

export function useDocuments() {
  const { user, profile, isAdmin } = useAuth()
  const { addToast } = useToast()
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Fetch documents from Supabase
  const loadDocuments = useCallback(async () => {
    if (!user?.id) {
      setIsLoaded(true)
      return
    }

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
      const mapped: Document[] = data.map(p => {
        let contentObj = ''
        try {
          // Try parsing Tiptap JSON if stored as JSON string
          contentObj = JSON.parse(p.content)
        } catch {
          contentObj = p.content || ''
        }

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
        }
      })

      setDocuments(mapped)
      if (mapped.length > 0 && !activeDocId) {
        setActiveDocId(mapped[0].id)
      }
    }
    setIsLoaded(true)
  }, [user?.id, activeDocId])

  useEffect(() => {
    loadDocuments()
  }, [user?.id, loadDocuments])

  // Create new draft
  const createDocument = useCallback(async () => {
    if (!user?.id || !profile?.username) {
      addToast('Login required to create posts', 'error')
      return null
    }

    const newId = crypto.randomUUID()
    const newDoc: Document = {
      id: newId,
      title: 'Untitled Document',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      published: false,
      slug: 'untitled-' + Math.floor(Math.random() * 100000),
      category: 'General',
      image_url: '',
    }

    const { error } = await supabase
      .from('posts')
      .insert({
        id: newDoc.id,
        title: newDoc.title,
        slug: newDoc.slug,
        content: '',
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
    addToast('New draft created', 'success')
    return newDoc
  }, [user, profile, isAdmin, addToast])

  // Update existing document
  const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
    setDocuments(prev =>
      prev.map(doc => {
        if (doc.id === id) {
          const updated = { ...doc, ...updates, updatedAt: Date.now() }
          
          // Async sync to database
          syncToSupabase(updated)
          
          return updated
        }
        return doc
      })
    )
  }, [])

  // Sync state to Supabase
  const syncToSupabase = async (doc: Document) => {
    if (!user?.id) return

    // Extract first image url from content if exists
    let extractedImage = doc.image_url || ''
    const content = doc.content
    if (content) {
      if (typeof content === 'string') {
        const match = content.match(/<img[^>]+src="([^">]+)"/)
        if (match) extractedImage = match[1]
      } else if (typeof content === 'object') {
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
    const rawContent = typeof doc.content === 'object' ? JSON.stringify(doc.content) : doc.content

    const { error } = await supabase
      .from('posts')
      .update({
        title: doc.title,
        slug: finalSlug,
        content: rawContent || '',
        excerpt: doc.title || '',
        image_url: extractedImage || null,
        published: doc.published ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doc.id)

    if (error) {
      console.error('Failed to sync changes with Supabase:', error.message)
    }
  }

  // Delete document
  const deleteDocument = useCallback(async (id: string) => {
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
    addToast('Post deleted', 'success')
  }, [activeDocId, addToast])

  return {
    documents,
    activeDocId,
    setActiveDocId,
    createDocument,
    updateDocument,
    deleteDocument,
    isLoaded,
    activeDocument: documents.find(d => d.id === activeDocId) || null,
  }
}
