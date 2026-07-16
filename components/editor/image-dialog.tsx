/* eslint-disable */
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, Upload, X, ImageIcon, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageDialogProps {
  open: boolean
  onClose: () => void
  onInsert: (src: string, alt?: string) => void
}

export function ImageDialog({ open, onClose, onInsert }: ImageDialogProps) {
  const [tab, setTab] = useState<'url' | 'upload'>('url')
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setUrl('')
    setAlt('')
    setPreview(null)
    setError(null)
    setUploading(false)
    setTab('url')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleInsert = () => {
    const src = tab === 'url' ? url.trim() : preview
    if (!src) { setError('Please enter an image URL or upload a file.'); return }
    onInsert(src, alt.trim() || undefined)
    handleClose()
  }

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large. Max 5 MB. For larger images, use a URL instead.')
      return
    }
    setError(null)
    setUploading(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleUrlPreview = () => {
    if (url.trim()) setPreview(url.trim())
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 480, damping: 36 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] max-w-[95vw] rounded-3xl border border-white/30 dark:border-white/10 bg-white/90 dark:bg-zinc-900/95 shadow-2xl shadow-black/20 backdrop-blur-2xl p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-foreground/8 flex items-center justify-center">
                  <ImageIcon size={15} className="text-foreground/70" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Insert Image</h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/8 dark:hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl mb-4">
              {(['url', 'upload'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setError(null) }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                    tab === t
                      ? 'bg-white dark:bg-zinc-800 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t === 'url' ? <Link size={13} /> : <Upload size={13} />}
                  {t === 'url' ? 'URL' : 'Upload'}
                </button>
              ))}
            </div>

            {/* URL Tab */}
            {tab === 'url' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Image URL</label>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={url}
                      onChange={e => { setUrl(e.target.value); setPreview(null) }}
                      onKeyDown={e => e.key === 'Enter' && handleInsert()}
                      className="flex-1 text-sm bg-black/5 dark:bg-white/8 border border-border/40 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40 text-foreground"
                    />
                    <button
                      type="button"
                      onClick={handleUrlPreview}
                      className="text-xs font-medium px-3 py-2 rounded-xl bg-black/8 dark:bg-white/8 text-foreground/70 hover:text-foreground transition-colors whitespace-nowrap"
                    >
                      Preview
                    </button>
                  </div>
                </div>
                {preview && tab === 'url' && (
                  <div className="rounded-2xl overflow-hidden border border-border/30 bg-black/5 dark:bg-white/5">
                    <img src={preview} alt="preview" className="w-full max-h-48 object-contain" onError={() => { setPreview(null); setError('Could not load image from this URL.') }} />
                  </div>
                )}
              </div>
            )}

            {/* Upload Tab */}
            {tab === 'upload' && (
              <div className="space-y-3">
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'relative rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center py-8 gap-3',
                    dragOver
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/40 hover:border-border/70 hover:bg-black/3 dark:hover:bg-white/3'
                  )}
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : preview ? (
                    <img src={preview} alt="preview" className="max-h-40 max-w-full rounded-xl object-contain" />
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-2xl bg-foreground/8 flex items-center justify-center">
                        <Upload size={18} className="text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground/70">Drop image here or click to browse</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG, GIF, WebP — max 5 MB</p>
                      </div>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
                  />
                </div>
              </div>
            )}

            {/* Alt text */}
            <div className="mt-3">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alt text (optional)</label>
              <input
                type="text"
                placeholder="Describe the image..."
                value={alt}
                onChange={e => setAlt(e.target.value)}
                className="w-full text-sm bg-black/5 dark:bg-white/8 border border-border/40 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40 text-foreground"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-start gap-2 text-xs text-destructive bg-destructive/8 rounded-xl px-3 py-2.5">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-black/5 dark:bg-white/8 text-foreground/70 hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsert}
                disabled={tab === 'url' ? !url.trim() : !preview}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-foreground text-background disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Insert Image
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
