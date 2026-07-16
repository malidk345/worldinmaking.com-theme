import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Globe, Clock, Tag, FileText, Link2, Upload, ImageIcon, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Document } from '@/hooks/use-documents'

interface PublishPanelProps {
  open: boolean
  onClose: () => void
  document: Document
  onUpdate: (updates: Partial<Document>) => void
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  const add = () => {
    const trimmed = input.trim().replace(/,/g, '').slice(0, 32)
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed])
    setInput('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 text-xs bg-foreground/8 dark:bg-white/10 text-foreground/70 rounded-lg px-2.5 py-1">
            {t}
            <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="text-muted-foreground hover:text-foreground ml-0.5">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          placeholder="Add a tag…"
          className="flex-1 text-sm bg-black/5 dark:bg-white/8 border border-border/40 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40 text-foreground"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="px-3 py-2 rounded-xl text-xs font-medium bg-foreground/8 dark:bg-white/10 text-foreground/70 hover:text-foreground disabled:opacity-40 transition-colors"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-muted-foreground/50 mt-1.5 px-0.5">Press Enter or comma to add</p>
    </div>
  )
}

function CoverPicker({ value, onChange }: { value?: string; onChange: (src: string | undefined) => void }) {
  const [tab, setTab] = useState<'url' | 'upload'>('upload')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image.'); return }
    if (file.size > 8 * 1024 * 1024) { setError('Max 8 MB.'); return }
    setError('')
    const reader = new FileReader()
    reader.onload = e => onChange(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [onChange])

  const applyUrl = () => {
    if (url.trim()) { onChange(url.trim()); setError('') }
  }

  if (value) {
    return (
      <div className="relative group rounded-2xl overflow-hidden border border-border/30">
        <img src={value} alt="cover" className="w-full h-28 object-cover" onError={() => { onChange(undefined); setError('Could not load image.') }} />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-black/60 rounded-xl px-3 py-1.5 backdrop-blur-sm"
          >
            <Trash2 size={11} /> Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Tab row */}
      <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl mb-3">
        {(['upload', 'url'] as const).map(t => (
          <button key={t} type="button" onClick={() => { setTab(t); setError('') }}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all',
              tab === t ? 'bg-white dark:bg-zinc-800 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}>
            {t === 'upload' ? <Upload size={11} /> : <Link2 size={11} />}
            {t === 'upload' ? 'Upload' : 'URL'}
          </button>
        ))}
      </div>

      {tab === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center py-6 gap-2',
            dragging ? 'border-primary/60 bg-primary/5' : 'border-border/40 hover:border-border/70 hover:bg-black/3 dark:hover:bg-white/3'
          )}
        >
          <div className="w-9 h-9 rounded-xl bg-foreground/8 flex items-center justify-center">
            <ImageIcon size={15} className="text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-foreground/70">Drop image here or click</p>
            <p className="text-xs text-muted-foreground/50 mt-0.5">PNG, JPG, WebP — max 8 MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
        </div>
      )}

      {tab === 'url' && (
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyUrl()}
            placeholder="https://example.com/image.jpg"
            className="flex-1 text-sm bg-black/5 dark:bg-white/8 border border-border/40 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40 text-foreground"
          />
          <button type="button" onClick={applyUrl} disabled={!url.trim()}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-foreground/8 dark:bg-white/10 text-foreground/70 hover:text-foreground disabled:opacity-40 transition-colors whitespace-nowrap">
            Set
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  )
}

export function PublishPanel({ open, onClose, document, onUpdate }: PublishPanelProps) {
  const [slug, setSlug] = useState(document.slug || '')
  const [excerpt, setExcerpt] = useState(document.excerpt || '')
  const [tags, setTags] = useState<string[]>(document.tags || [])
  const [slugEdited, setSlugEdited] = useState(!!document.slug)

  // Sync from document prop when it changes (e.g. different doc selected)
  useEffect(() => {
    setSlug(document.slug || '')
    setExcerpt(document.excerpt || '')
    setTags(document.tags || [])
    setSlugEdited(!!document.slug)
  }, [document.id])

  // Auto-derive slug from title if user hasn't manually edited it
  useEffect(() => {
    if (!slugEdited && document.title) setSlug(slugify(document.title))
  }, [document.title, slugEdited])

  const handlePublish = () => {
    const now = Date.now()
    onUpdate({
      slug: slug || slugify(document.title),
      excerpt,
      tags,
      published: true,
      publishedAt: document.publishedAt || now,
    })
  }

  const handleUnpublish = () => {
    onUpdate({ published: false })
  }

  const handleSaveDraft = () => {
    onUpdate({ slug: slug || slugify(document.title), excerpt, tags })
    onClose()
  }

  const isPublished = !!document.published

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-50 w-80',
              'border-l border-border/40',
              'bg-white/88 dark:bg-zinc-900/92 backdrop-blur-2xl',
              'flex flex-col shadow-2xl shadow-black/10 dark:shadow-black/30'
            )}
          >
            {/* Header */}
            <div className="h-12 flex items-center justify-between px-5 border-b border-border/30 shrink-0">
              <div className="flex items-center gap-2">
                <Globe size={14} className={cn('transition-colors', isPublished ? 'text-emerald-500' : 'text-muted-foreground')} />
                <h2 className="text-sm font-semibold text-foreground">Publish</h2>
                {isPublished && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                    Live
                  </span>
                )}
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/8 dark:hover:bg-white/10 transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Status strip */}
            <div className={cn(
              'mx-4 mt-3 rounded-2xl px-3 py-2.5 flex items-center gap-2.5 text-xs',
              isPublished
                ? 'bg-emerald-500/8 border border-emerald-500/20'
                : 'bg-foreground/5 border border-border/30'
            )}>
              {isPublished
                ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                : <Circle size={13} className="text-muted-foreground shrink-0" />
              }
              <span className={cn('font-medium', isPublished ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
                {isPublished
                  ? `Published ${document.publishedAt ? new Date(document.publishedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}`
                  : 'Draft — not yet published'
                }
              </span>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Cover image */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <ImageIcon size={13} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cover Image</span>
                </div>
                <CoverPicker
                  value={document.coverImage}
                  onChange={src => onUpdate({ coverImage: src })}
                />
              </div>

              {/* Slug */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={13} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">URL Slug</span>
                </div>
                <div className="flex items-center bg-black/5 dark:bg-white/8 border border-border/40 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary/30">
                  <span className="text-xs text-muted-foreground/50 pl-3 shrink-0">/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugEdited(true) }}
                    placeholder={slugify(document.title) || 'post-slug'}
                    className="flex-1 text-sm bg-transparent px-1.5 py-2 outline-none placeholder:text-muted-foreground/40 text-foreground"
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={13} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Excerpt</span>
                </div>
                <textarea
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  placeholder="Short description shown in post listings…"
                  rows={3}
                  className="w-full text-sm bg-black/5 dark:bg-white/8 border border-border/40 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40 text-foreground resize-none leading-relaxed"
                />
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Tag size={13} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tags</span>
                </div>
                <TagInput tags={tags} onChange={setTags} />
              </div>

              {/* Published date (read-only if published) */}
              {isPublished && document.publishedAt && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={13} className="text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Published</span>
                  </div>
                  <p className="text-sm text-foreground/60 px-0.5">
                    {new Date(document.publishedAt).toLocaleString('en', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-border/30 shrink-0 space-y-2">
              {isPublished ? (
                <>
                  <button
                    type="button"
                    onClick={() => { handleSaveDraft() }}
                    className="w-full py-2.5 rounded-2xl text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={handleUnpublish}
                    className="w-full py-2.5 rounded-2xl text-sm font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/8 transition-colors"
                  >
                    Unpublish
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="w-full py-2.5 rounded-2xl text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Globe size={14} />
                    Publish Post
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="w-full py-2.5 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 transition-colors"
                  >
                    Save draft info
                  </button>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
