import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Editor } from '@tiptap/react'
import { Document, Folder } from '@/hooks/use-documents'
import { cn } from '@/lib/utils'
import {
  Search, FileText, Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Quote, CodeSquare, Minus, ImageIcon, Table, Youtube,
  Info, AlertTriangle, CheckCircle, XCircle, Lightbulb,
  Moon, Sun, Maximize2, Minimize2, SlidersHorizontal, Plus,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  group: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  editor: Editor | null
  documents: Document[]
  activeDocId: string | null
  onNavigateToDoc: (id: string) => void
  onNewDoc: () => void
  onInsertImage: () => void
  theme: string
  onToggleTheme: () => void
  focusMode: boolean
  onToggleFocusMode: () => void
  onOpenSettings: () => void
}

export function CommandPalette({
  open, onClose, editor, documents, activeDocId,
  onNavigateToDoc, onNewDoc, onInsertImage,
  theme, onToggleTheme, focusMode, onToggleFocusMode, onOpenSettings,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) { setQuery(''); setSelected(0); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  // ── Keyboard shortcut to open ──────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) onClose()
        else { /* parent opens via its own listener */ }
      }
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const editorCommands: CommandItem[] = useMemo(() => {
    if (!editor) return []
    const ins = (fn: () => void) => () => { fn(); onClose() }
    return [
      { id: 'h1',        label: 'Heading 1',    group: 'Insert Block', icon: <Heading1 size={15}/>,      action: ins(() => editor.chain().focus().setHeading({ level: 1 }).run()) },
      { id: 'h2',        label: 'Heading 2',    group: 'Insert Block', icon: <Heading2 size={15}/>,      action: ins(() => editor.chain().focus().setHeading({ level: 2 }).run()) },
      { id: 'h3',        label: 'Heading 3',    group: 'Insert Block', icon: <Heading3 size={15}/>,      action: ins(() => editor.chain().focus().setHeading({ level: 3 }).run()) },
      { id: 'bullet',    label: 'Bullet List',  group: 'Insert Block', icon: <List size={15}/>,          action: ins(() => editor.chain().focus().toggleBulletList().run()) },
      { id: 'numbered',  label: 'Numbered List',group: 'Insert Block', icon: <ListOrdered size={15}/>,   action: ins(() => editor.chain().focus().toggleOrderedList().run()) },
      { id: 'todo',      label: 'To-do List',   group: 'Insert Block', icon: <CheckSquare size={15}/>,   action: ins(() => editor.chain().focus().toggleTaskList().run()) },
      { id: 'quote',     label: 'Quote',        group: 'Insert Block', icon: <Quote size={15}/>,         action: ins(() => editor.chain().focus().toggleBlockquote().run()) },
      { id: 'code',      label: 'Code Block',   group: 'Insert Block', icon: <CodeSquare size={15}/>,    action: ins(() => editor.chain().focus().toggleCodeBlock().run()) },
      { id: 'divider',   label: 'Divider',      group: 'Insert Block', icon: <Minus size={15}/>,         action: ins(() => editor.chain().focus().setHorizontalRule().run()) },
      { id: 'table',     label: 'Table',        group: 'Insert Block', icon: <Table size={15}/>,         action: ins(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()) },
      { id: 'callout-info',    label: 'Info Callout',    group: 'Insert Block', icon: <Info size={15} className="text-primary/70"/>,     action: ins(() => (editor.chain().focus() as any).setCallout({ type: 'info' }).run()) },
      { id: 'callout-warning', label: 'Warning Callout', group: 'Insert Block', icon: <AlertTriangle size={15} className="text-gray-500"/>, action: ins(() => (editor.chain().focus() as any).setCallout({ type: 'warning' }).run()) },
      { id: 'callout-success', label: 'Success Callout', group: 'Insert Block', icon: <CheckCircle size={15} className="text-green-500"/>,  action: ins(() => (editor.chain().focus() as any).setCallout({ type: 'success' }).run()) },
      { id: 'callout-error',   label: 'Error Callout',   group: 'Insert Block', icon: <XCircle size={15} className="text-red-500"/>,       action: ins(() => (editor.chain().focus() as any).setCallout({ type: 'error' }).run()) },
      { id: 'callout-tip',     label: 'Tip Callout',     group: 'Insert Block', icon: <Lightbulb size={15} className="text-violet-500"/>,   action: ins(() => (editor.chain().focus() as any).setCallout({ type: 'tip' }).run()) },
      { id: 'image',     label: 'Insert Image', group: 'Insert Block', icon: <ImageIcon size={15}/>,      action: ins(onInsertImage) },
    ]
  }, [editor, onClose, onInsertImage])

  const docItems: CommandItem[] = useMemo(() =>
    documents.map(d => ({
      id: `doc-${d.id}`,
      label: d.title || 'Untitled',
      description: d.preview || 'Empty document',
      group: 'Documents',
      icon: <span className="text-base leading-none">{d.icon}</span>,
      action: () => { onNavigateToDoc(d.id); onClose() },
    })),
    [documents, onNavigateToDoc, onClose]
  )

  const actionItems: CommandItem[] = useMemo(() => [
    { id: 'new-doc',    label: 'New Document',         group: 'Actions', icon: <Plus size={15}/>,          action: () => { onNewDoc(); onClose() } },
    { id: 'focus',      label: focusMode ? 'Exit Focus Mode' : 'Focus Mode',  group: 'Actions', icon: focusMode ? <Minimize2 size={15}/> : <Maximize2 size={15}/>, action: () => { onToggleFocusMode(); onClose() } },
    { id: 'theme',      label: theme === 'dark' ? 'Light Mode' : 'Dark Mode', group: 'Actions', icon: theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>,     action: () => { onToggleTheme(); onClose() } },
    { id: 'settings',   label: 'Editor Settings',       group: 'Actions', icon: <SlidersHorizontal size={15}/>, action: () => { onOpenSettings(); onClose() } },
  ], [focusMode, theme, onNewDoc, onToggleFocusMode, onToggleTheme, onOpenSettings, onClose])

  const allItems = [...actionItems, ...docItems, ...editorCommands]

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems
    const q = query.toLowerCase()
    return allItems.filter(i =>
      i.label.toLowerCase().includes(q) ||
      i.group.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    )
  }, [query, allItems])

  // Group filtered items
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    for (const item of filtered) {
      if (!map.has(item.group)) map.set(item.group, [])
      map.get(item.group)!.push(item)
    }
    return map
  }, [filtered])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter')     { e.preventDefault(); filtered[selected]?.action() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selected])

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  useEffect(() => { setSelected(0) }, [query])

  let flatIdx = 0

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            className="fixed z-50 top-[18%] left-1/2 -translate-x-1/2 w-[560px] max-w-[95vw] rounded-3xl border border-white/30 dark:border-white/10 bg-white/90 dark:bg-zinc-900/95 shadow-2xl shadow-black/20 backdrop-blur-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/25">
              <Search size={16} className="text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search documents, commands…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
              />
              <kbd className="text-[10px] text-muted-foreground/50 bg-black/5 dark:bg-white/8 px-1.5 py-0.5 rounded-md font-mono">ESC</kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[380px] overflow-y-auto custom-scrollbar py-2">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground/50 py-8">No results for "{query}"</p>
              ) : (
                Array.from(grouped.entries()).map(([group, items]) => (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider px-4 pt-3 pb-1">{group}</p>
                    {items.map(item => {
                      const idx = flatIdx++
                      return (
                        <button
                          key={item.id}
                          data-idx={idx}
                          type="button"
                          onMouseEnter={() => setSelected(idx)}
                          onClick={item.action}
                          className={cn(
                            'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
                            selected === idx ? 'bg-black/5 dark:bg-white/8' : 'hover:bg-black/3 dark:hover:bg-white/5'
                          )}
                        >
                          <span className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0',
                            selected === idx ? 'bg-foreground/10' : 'bg-foreground/6'
                          )}>
                            {item.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                            {item.description && <p className="text-xs text-muted-foreground/60 truncate">{item.description}</p>}
                          </div>
                          {item.group === 'Documents' && activeDocId === item.id.replace('doc-', '') && (
                            <span className="text-[10px] text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-md shrink-0">Current</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-border/20 flex items-center gap-3 text-[10px] text-muted-foreground/40">
              <span><kbd className="font-mono">↑↓</kbd> Navigate</span>
              <span><kbd className="font-mono">↵</kbd> Select</span>
              <span><kbd className="font-mono">ESC</kbd> Close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
