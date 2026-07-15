import { motion, AnimatePresence } from 'framer-motion'
import { X, Type, AlignLeft, Columns, MoveHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditorSettings, FontFamily, FontSize, LineHeight, ContentWidth } from '@/hooks/use-editor-settings'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  settings: EditorSettings
  onUpdate: (updates: Partial<EditorSettings>) => void
}

function SegmentControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-0.5 p-1 bg-black/5 dark:bg-white/6 rounded-xl">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-150',
            value === opt.value
              ? 'bg-white dark:bg-zinc-700 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsPanel({ open, onClose, settings, onUpdate }: SettingsPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop (mobile only) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-50 w-72',
              'border-l border-border/40',
              'bg-white/85 dark:bg-zinc-900/90 backdrop-blur-2xl',
              'flex flex-col shadow-2xl shadow-black/10 dark:shadow-black/30'
            )}
          >
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-5 border-b border-border/30 shrink-0">
              <h2 className="text-sm font-semibold text-foreground">Editor Settings</h2>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/8 dark:hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* Font Family */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Type size={13} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Font</span>
                </div>
                <SegmentControl<FontFamily>
                  value={settings.fontFamily}
                  onChange={v => onUpdate({ fontFamily: v })}
                  options={[
                    { value: 'system', label: 'System' },
                    { value: 'serif', label: 'Serif' },
                    { value: 'mono', label: 'Mono' },
                  ]}
                />
                <p className="text-xs text-muted-foreground/60 mt-2 px-0.5">
                  {settings.fontFamily === 'system' && 'San Francisco / Helvetica Neue'}
                  {settings.fontFamily === 'serif' && 'Lora — elegant for long-form writing'}
                  {settings.fontFamily === 'mono' && 'Menlo / Courier — code-style writing'}
                </p>
              </div>

              {/* Font Size */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-muted-foreground text-xs font-bold">Aa</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Size</span>
                </div>
                <SegmentControl<FontSize>
                  value={settings.fontSize}
                  onChange={v => onUpdate({ fontSize: v })}
                  options={[
                    { value: 'sm', label: 'Small' },
                    { value: 'md', label: 'Medium' },
                    { value: 'lg', label: 'Large' },
                  ]}
                />
              </div>

              {/* Line Height */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <AlignLeft size={13} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Spacing</span>
                </div>
                <SegmentControl<LineHeight>
                  value={settings.lineHeight}
                  onChange={v => onUpdate({ lineHeight: v })}
                  options={[
                    { value: 'tight', label: 'Tight' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'relaxed', label: 'Relaxed' },
                  ]}
                />
              </div>

              {/* Content Width */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <MoveHorizontal size={13} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Width</span>
                </div>
                <SegmentControl<ContentWidth>
                  value={settings.contentWidth}
                  onChange={v => onUpdate({ contentWidth: v })}
                  options={[
                    { value: 'narrow', label: 'Narrow' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'wide', label: 'Wide' },
                  ]}
                />
              </div>

              {/* Preview */}
              <div className="rounded-2xl border border-border/30 p-4 bg-black/3 dark:bg-white/3">
                <p className="text-xs font-medium text-muted-foreground/70 mb-2">Preview</p>
                <p
                  className={cn(
                    'text-foreground/80 transition-all duration-300',
                    settings.fontFamily === 'system' && 'font-sans',
                    settings.fontFamily === 'serif' && 'font-serif',
                    settings.fontFamily === 'mono' && 'font-mono',
                    settings.fontSize === 'sm' && 'text-[14px]',
                    settings.fontSize === 'md' && 'text-[16px]',
                    settings.fontSize === 'lg' && 'text-[19px]',
                    settings.lineHeight === 'tight' && 'leading-snug',
                    settings.lineHeight === 'normal' && 'leading-relaxed',
                    settings.lineHeight === 'relaxed' && 'leading-loose',
                  )}
                >
                  The quick brown fox jumps over the lazy dog. Every word matters.
                </p>
              </div>
            </div>

            {/* Reset */}
            <div className="px-5 pb-6 pt-3 border-t border-border/20 shrink-0">
              <button
                type="button"
                onClick={() => onUpdate({ fontFamily: 'system', fontSize: 'md', lineHeight: 'normal', contentWidth: 'normal' })}
                className="w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 transition-colors"
              >
                Reset to defaults
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
