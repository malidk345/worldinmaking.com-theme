import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Folder, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FOLDER_ICONS, RenderIcon } from './icons'

interface FolderDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (name: string, emoji: string) => void
  initialName?: string
  initialEmoji?: string
  title?: string
  confirmLabel?: string
}

export function FolderDialog({
  open, onClose, onConfirm,
  initialName = '', initialEmoji = 'folder', title = 'New Folder', confirmLabel = 'Create',
}: FolderDialogProps) {
  const [name, setName] = useState(initialName)
  const [emoji, setEmoji] = useState(initialEmoji)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => { setName(initialName); setEmoji(initialEmoji); setError(null); onClose() }
  const handleConfirm = () => {
    if (!name.trim()) { setError('Please enter a folder name.'); return }
    onConfirm(name.trim(), emoji)
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
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] max-w-[95vw] rounded-3xl border border-white/30 dark:border-white/10 bg-white/90 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Folder size={15} className="text-primary" /></div>
                <h2 className="text-base font-semibold text-foreground">{title}</h2>
              </div>
              <button onClick={handleClose} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/8 transition-colors"><X size={15} /></button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="relative group">
                <button
                  type="button"
                  className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/8 flex items-center justify-center hover:bg-black/10 transition-colors animate-in fade-in"
                >
                  <RenderIcon name={emoji} size={18} className="text-foreground/80" />
                </button>
              </div>
              <input
                autoFocus
                type="text"
                placeholder="Folder name"
                value={name}
                onChange={e => { setName(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                className="flex-1 text-sm bg-black/5 dark:bg-white/8 border border-border/40 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40 text-foreground"
              />
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Folder Icon</p>
            <div className="grid grid-cols-6 gap-1.5 mb-4">
              {FOLDER_ICONS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                    emoji === e ? 'bg-black/8 dark:bg-white/12 ring-1 ring-foreground/20' : 'hover:bg-black/5 dark:hover:bg-white/6'
                  )}
                >
                  <RenderIcon name={e} size={14} className="text-foreground/75" />
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-3 flex items-start gap-2 text-xs text-destructive bg-destructive/8 rounded-xl px-3 py-2.5">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={handleClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-black/5 dark:bg-white/8 text-foreground/70 hover:text-foreground transition-colors">Cancel</button>
              <button type="button" onClick={handleConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-foreground text-background hover:opacity-90 transition-opacity">{confirmLabel}</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
