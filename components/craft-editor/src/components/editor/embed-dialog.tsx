import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Youtube, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmbedDialogProps {
  open: boolean
  onClose: () => void
  onInsert: (src: string) => void
}

function extractVideoId(input: string): string | null {
  if (!input.trim()) return null
  // short url
  const short = input.match(/(?:youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (short) return short[1]
  const long = input.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)
  if (long) return long[1]
  // raw id
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim()
  return null
}

export function EmbedDialog({ open, onClose, onInsert }: EmbedDialogProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reset = () => { setUrl(''); setError(null) }
  const handleClose = () => { reset(); onClose() }

  const handleInsert = () => {
    const id = extractVideoId(url)
    if (!id) { setError('Please enter a valid YouTube URL or video ID.'); return }
    onInsert(id)
    handleClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 480, damping: 36 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[95vw] rounded-3xl border border-white/30 dark:border-white/10 bg-white/90 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Youtube size={15} className="text-red-500" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Embed YouTube</h2>
              </div>
              <button onClick={handleClose} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/8 dark:hover:bg-white/10 transition-colors"><X size={15} /></button>
            </div>

            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">YouTube URL or video ID</label>
            <input
              autoFocus
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={e => { setUrl(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleInsert()}
              className="w-full text-sm bg-black/5 dark:bg-white/8 border border-border/40 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40 text-foreground"
            />

            {error && (
              <div className="mt-3 flex items-start gap-2 text-xs text-destructive bg-destructive/8 rounded-xl px-3 py-2.5">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button type="button" onClick={handleClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-black/5 dark:bg-white/8 text-foreground/70 hover:text-foreground transition-colors">Cancel</button>
              <button type="button" onClick={handleInsert} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">Embed</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
