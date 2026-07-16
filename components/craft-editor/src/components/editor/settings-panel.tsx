import { motion, AnimatePresence } from 'framer-motion'
import { X, Type, AlignLeft, MoveHorizontal, Target, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditorSettings, FontFamily, FontSize, LineHeight, ContentWidth } from '@/hooks/use-editor-settings'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  settings: EditorSettings
  onUpdate: (updates: Partial<EditorSettings>) => void
}

interface SegOption { value: string; label: string }

function Seg({ value, options, onChange }: { value: string; options: SegOption[]; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-0.5 p-1 bg-black/5 dark:bg-white/6 rounded-xl">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-150',
            value === opt.value ? 'bg-white dark:bg-zinc-700 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
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
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-50 w-72',
              'border-l border-border/40',
              'bg-white/85 dark:bg-zinc-900/90 backdrop-blur-2xl',
              'flex flex-col shadow-2xl shadow-black/10 dark:shadow-black/30'
            )}
          >
            <div className="h-12 flex items-center justify-between px-5 border-b border-border/30 shrink-0">
              <h2 className="text-sm font-semibold text-foreground">Editor Settings</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/8 dark:hover:bg-white/10 transition-colors"><X size={15} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Type size={13} className="text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Focus Mode</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdate({ focusMode: !settings.focusMode })}
                    className={cn('w-10 h-5 rounded-full transition-colors relative', settings.focusMode ? 'bg-primary' : 'bg-black/10 dark:bg-white/15')}
                  >
                    <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform', settings.focusMode && 'translate-x-5')} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground/60 px-0.5">Hides the sidebar and top chrome while you write.</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2.5"><Type size={13} className="text-muted-foreground" /><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Font</span></div>
                <Seg
                  value={settings.fontFamily}
                  onChange={v => onUpdate({ fontFamily: v as FontFamily })}
                  options={[{ value: 'system', label: 'System' }, { value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Mono' }]}
                />
                <p className="text-xs text-muted-foreground/60 mt-2 px-0.5">
                  {settings.fontFamily === 'system' && 'San Francisco / Helvetica Neue'}
                  {settings.fontFamily === 'serif' && 'Lora -- elegant for long-form writing'}
                  {settings.fontFamily === 'mono' && 'Menlo / Courier -- code-style writing'}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2.5"><span className="text-muted-foreground text-xs font-bold">Aa</span><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Size</span></div>
                <Seg
                  value={settings.fontSize}
                  onChange={v => onUpdate({ fontSize: v as FontSize })}
                  options={[{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }]}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2.5"><AlignLeft size={13} className="text-muted-foreground" /><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Spacing</span></div>
                <Seg
                  value={settings.lineHeight}
                  onChange={v => onUpdate({ lineHeight: v as LineHeight })}
                  options={[{ value: 'tight', label: 'Tight' }, { value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Relaxed' }]}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2.5"><MoveHorizontal size={13} className="text-muted-foreground" /><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Width</span></div>
                <Seg
                  value={settings.contentWidth}
                  onChange={v => onUpdate({ contentWidth: v as ContentWidth })}
                  options={[{ value: 'narrow', label: 'Narrow' }, { value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Wide' }]}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2.5"><Target size={13} className="text-muted-foreground" /><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Word Goal</span></div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 300, 500, 1000].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => onUpdate({ wordCountGoal: g })}
                      className={cn(
                        'py-1.5 px-2 rounded-xl text-xs font-medium transition-all',
                        settings.wordCountGoal === g ? 'bg-white dark:bg-zinc-700 text-foreground shadow-sm' : 'bg-black/5 dark:bg-white/6 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {g === 0 ? 'Off' : `${g}`}
                    </button>
                  ))}
                </div>
              </div>

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

            <div className="px-5 pb-6 pt-3 border-t border-border/20 shrink-0">
              <button
                type="button"
                onClick={() => onUpdate({ fontFamily: 'system', fontSize: 'md', lineHeight: 'normal', contentWidth: 'normal', wordCountGoal: 0 })}
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
