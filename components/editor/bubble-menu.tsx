import { useState, useRef, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Bold, Italic, Underline, Strikethrough, Code, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Type, Quote, List, ListOrdered, ChevronDown, X, Link, Baseline,
  Highlighter, RemoveFormatting, Check, CodeSquare, Superscript, Subscript, ImageIcon, Table
} from 'lucide-react'

const BLOCK_TYPES = [
  { label: 'Text',        Icon: Type,         command: (e: Editor) => e.chain().focus().setParagraph().run(),            isActive: (e: Editor) => e.isActive('paragraph') && !e.isActive('blockquote') && !e.isActive('codeBlock') },
  { label: 'Heading 1',  Icon: Heading1,      command: (e: Editor) => e.chain().focus().setHeading({ level: 1 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 1 }) },
  { label: 'Heading 2',  Icon: Heading2,      command: (e: Editor) => e.chain().focus().setHeading({ level: 2 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 2 }) },
  { label: 'Heading 3',  Icon: Heading3,      command: (e: Editor) => e.chain().focus().setHeading({ level: 3 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 3 }) },
  { label: 'Quote',       Icon: Quote,         command: (e: Editor) => e.chain().focus().toggleBlockquote().run(),       isActive: (e: Editor) => e.isActive('blockquote') },
  { label: 'Code Block',  Icon: CodeSquare,    command: (e: Editor) => e.chain().focus().toggleCodeBlock().run(),        isActive: (e: Editor) => e.isActive('codeBlock') },
  { label: 'Bullet List', Icon: List,          command: (e: Editor) => e.chain().focus().toggleBulletList().run(),       isActive: (e: Editor) => e.isActive('bulletList') },
  { label: 'Numbered',    Icon: ListOrdered,   command: (e: Editor) => e.chain().focus().toggleOrderedList().run(),      isActive: (e: Editor) => e.isActive('orderedList') },
]

const TEXT_COLORS = [
  { label: 'Default', value: null },
  { label: 'Red',     value: '#ef4444' },
  { label: 'Orange',  value: '#f97316' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Green',   value: '#22c55e' },
  { label: 'Teal',    value: '#14b8a6' },
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Pink',    value: '#ec4899' },
]

const HIGHLIGHT_COLORS = [
  { label: 'None',   value: null },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Lime',   value: '#d9f99d' },
  { label: 'Cyan',   value: '#a5f3fc' },
  { label: 'Blue',   value: '#bfdbfe' },
  { label: 'Purple', value: '#e9d5ff' },
  { label: 'Pink',   value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
]

function Sep() { return <div className="w-px h-4 bg-black/10 dark:bg-white/12 shrink-0 mx-0.5" /> }

function Btn({ onClick, isActive, title, children, className }: { onClick: () => void; isActive?: boolean; title: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      aria-label={title}
      className={cn('flex items-center justify-center h-6 w-6 rounded-md text-sm transition-all duration-100 shrink-0', isActive ? 'bg-foreground text-background' : 'text-foreground/60 hover:text-foreground hover:bg-black/8 dark:hover:bg-white/12', className)}
    >{children}</button>
  )
}

function ColorSwatch({ color, isSelected, onClick, label }: { color: string | null; isSelected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={label}
      aria-label={label}
      className={cn('relative w-5 h-5 rounded-md transition-all duration-100', isSelected ? 'ring-2 ring-foreground/50 ring-offset-1 scale-110' : 'hover:scale-110')}
      style={{ backgroundColor: color ?? 'transparent' }}
    >
      {color === null && <><span className="absolute inset-0 flex items-center justify-center"><X size={10} className="text-muted-foreground" /></span><span className="absolute inset-0 rounded-md border border-border/60" /></>}
    </button>
  )
}

interface EditorBubbleMenuProps { editor: Editor; onInsertImage: () => void }

export function EditorBubbleMenu({ editor, onInsertImage }: EditorBubbleMenuProps) {
  const [blockOpen, setBlockOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [hlOpen, setHlOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const blockRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)
  const hlRef = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) setBlockOpen(false)
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setColorOpen(false)
      if (hlRef.current && !hlRef.current.contains(e.target as Node)) setHlOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!editor) return null

  const closeAll = () => { setBlockOpen(false); setColorOpen(false); setHlOpen(false); setLinkOpen(false) }
  const activeBlock = BLOCK_TYPES.find(b => b.isActive(editor)) ?? BLOCK_TYPES[0]
  const ActiveIcon = activeBlock.Icon
  const currentColor = editor.getAttributes('textStyle').color ?? null
  const currentHl = editor.getAttributes('highlight').color ?? null

  const applyLink = () => {
    if (linkUrl.trim()) editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run()
    else editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkOpen(false); setLinkUrl('')
  }

  const BubbleMenuComp = BubbleMenu as any

  return (
    <BubbleMenuComp
      editor={editor}
      tippyOptions={{ duration: [100, 70], animation: 'scale', placement: 'top', offset: [0, 10], maxWidth: 'none' }}
      shouldShow={({ state }: any) => { const { empty } = state.selection; if (empty) return false; if (editor.isActive('codeBlock')) return false; return true }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 34 }}
        className="flex items-center gap-0.5 px-1.5 py-1 rounded-2xl border border-white/35 dark:border-white/12 bg-white/88 dark:bg-zinc-900/90 shadow-xl shadow-black/10 dark:shadow-black/30 backdrop-blur-2xl"
      >
        {/* Block type */}
        <div className="relative" ref={blockRef}>
          <button type="button" onMouseDown={e => { e.preventDefault(); closeAll(); setBlockOpen(v => !v) }} aria-label="Toggle block type" className="flex items-center gap-1 h-6 px-1.5 rounded-md text-foreground/70 hover:text-foreground hover:bg-black/8 dark:hover:bg-white/12 transition-all whitespace-nowrap">
            <ActiveIcon size={13} /><span className="text-[11px] font-medium hidden sm:block">{activeBlock.label}</span>
            <ChevronDown size={10} className={cn('transition-transform duration-150', blockOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {blockOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                className="absolute top-full mt-2 left-0 z-[60] w-40 rounded-2xl border border-white/30 dark:border-white/10 bg-white/88 dark:bg-zinc-900/92 shadow-xl backdrop-blur-2xl p-1 flex flex-col gap-0.5">
                {BLOCK_TYPES.map(bt => {
                  const Icon = bt.Icon
                  return (
                    <button key={bt.label} type="button" onMouseDown={e => { e.preventDefault(); bt.command(editor); setBlockOpen(false) }}
                      className={cn('flex items-center gap-2 w-full px-2 py-1.5 rounded-xl text-left text-xs transition-all', bt.isActive(editor) ? 'bg-foreground/8 text-foreground font-medium' : 'text-foreground/65 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8')}>
                      <Icon size={13} className="shrink-0" /><span>{bt.label}</span>{bt.isActive(editor) && <Check size={11} className="ml-auto text-primary" />}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Sep />

        {/* Inline */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()}       isActive={editor.isActive('bold')} title="Bold (⌘B)"><Bold size={13} strokeWidth={2.5} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()}     isActive={editor.isActive('italic')} title="Italic (⌘I)"><Italic size={13} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()}  isActive={editor.isActive('underline')} title="Underline (⌘U)"><Underline size={13} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()}     isActive={editor.isActive('strike')} title="Strikethrough"><Strikethrough size={13} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()}       isActive={editor.isActive('code')} title="Inline Code"><Code size={13} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleSuperscript().run()} isActive={editor.isActive('superscript')} title="Superscript"><Superscript size={13} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleSubscript().run()}   isActive={editor.isActive('subscript')} title="Subscript"><Subscript size={13} /></Btn>

        <Sep />

        {/* Color */}
        <div className="relative" ref={colorRef}>
          <button type="button" onMouseDown={e => { e.preventDefault(); closeAll(); setColorOpen(v => !v) }} title="Text color" aria-label="Text color" className={cn('flex flex-col items-center justify-center h-6 w-6 rounded-md gap-[2px] transition-all', colorOpen ? 'bg-black/8 dark:bg-white/12' : 'text-foreground/60 hover:text-foreground hover:bg-black/8 dark:hover:bg-white/12')}>
            <Baseline size={11} /><div className="h-[3px] w-3.5 rounded-full" style={{ backgroundColor: currentColor ?? 'currentColor' }} />
          </button>
          <AnimatePresence>
            {colorOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[60] rounded-2xl border border-white/30 dark:border-white/10 bg-white/88 dark:bg-zinc-900/92 shadow-xl backdrop-blur-2xl p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Text color</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {TEXT_COLORS.map(c => <ColorSwatch key={c.label} color={c.value} label={c.label} isSelected={currentColor === c.value} onClick={() => { c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run(); setColorOpen(false) }} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Highlight */}
        <div className="relative" ref={hlRef}>
          <button type="button" onMouseDown={e => { e.preventDefault(); closeAll(); setHlOpen(v => !v) }} title="Highlight" aria-label="Highlight" className={cn('flex items-center justify-center h-6 w-6 rounded-md transition-all', (hlOpen || editor.isActive('highlight')) ? 'bg-black/8 dark:bg-white/12' : 'text-foreground/60 hover:text-foreground hover:bg-black/8 dark:hover:bg-white/12')} style={currentHl ? { color: currentHl } : undefined}>
            <Highlighter size={13} />
          </button>
          <AnimatePresence>
            {hlOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[60] rounded-2xl border border-white/30 dark:border-white/10 bg-white/88 dark:bg-zinc-900/92 shadow-xl backdrop-blur-2xl p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Highlight</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {HIGHLIGHT_COLORS.map(c => <ColorSwatch key={c.label} color={c.value} label={c.label} isSelected={currentHl === c.value || (!currentHl && c.value === null)} onClick={() => { c.value ? editor.chain().focus().setHighlight({ color: c.value }).run() : editor.chain().focus().unsetHighlight().run(); setHlOpen(false) }} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Sep />

        {/* Align */}
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()}    isActive={editor.isActive({ textAlign: 'left' }) || (!editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }) && !editor.isActive({ textAlign: 'justify' }))} title="Left"><AlignLeft size={13} /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()}  isActive={editor.isActive({ textAlign: 'center' })}  title="Center"><AlignCenter size={13} /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()}   isActive={editor.isActive({ textAlign: 'right' })}   title="Right"><AlignRight size={13} /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Justify"><AlignJustify size={13} /></Btn>

        <Sep />

        {/* Link */}
        <div className="relative">
          <Btn onClick={() => { closeAll(); setLinkUrl(editor.getAttributes('link').href ?? ''); setLinkOpen(v => !v); setTimeout(() => linkInputRef.current?.focus(), 50) }} isActive={editor.isActive('link')} title="Link"><Link size={13} /></Btn>
          <AnimatePresence>
            {linkOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                className="absolute top-full mt-2 right-0 z-[60] rounded-2xl border border-white/30 dark:border-white/10 bg-white/88 dark:bg-zinc-900/92 shadow-xl backdrop-blur-2xl p-3 w-56">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Link URL</p>
                <input ref={linkInputRef} type="url" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } if (e.key === 'Escape') setLinkOpen(false) }}
                  className="w-full text-xs bg-black/5 dark:bg-white/8 border border-border/40 rounded-xl px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40 text-foreground" />
                <div className="flex gap-1.5 mt-2">
                  <button type="button" onMouseDown={e => { e.preventDefault(); applyLink() }} className="flex-1 text-[11px] font-medium py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity">Apply</button>
                  {editor.isActive('link') && <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetLink().run(); setLinkOpen(false) }} className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">Remove</button>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table */}
        <Btn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table"><Table size={13} /></Btn>

        {/* Image */}
        <Btn onClick={() => { closeAll(); onInsertImage() }} title="Insert image"><ImageIcon size={13} /></Btn>

        {/* Clear */}
        <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting"><RemoveFormatting size={12} /></Btn>
      </motion.div>
    </BubbleMenuComp>
  )
}
