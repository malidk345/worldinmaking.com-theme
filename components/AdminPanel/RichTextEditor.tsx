"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { createLowlight, common } from 'lowlight'
import 'highlight.js/styles/github.css' // Light mode theme to prevent white text

import {
    Bold, Italic, List, ListOrdered, Quote, Heading2, Heading3,
    Link as LinkIcon, Image as ImageIcon, Undo, Redo, Code,
    Maximize2, Minimize2, Eye, EyeOff, Save,
    Underline as UnderlineIcon, Highlighter,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
    Terminal, Table as TableIcon, MessageSquareWarning, BookMarked
} from 'lucide-react'

// Initialize lowlight for code blocks
const lowlight = createLowlight(common)

import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        callout: {
            setCallout: () => ReturnType
        }
        references: {
            insertReferences: () => ReturnType
        }
    }
}

export const CalloutNode = Node.create({
    name: 'callout',
    group: 'block',
    content: 'inline*',
    selectable: true,
    draggable: true,
    parseHTML() {
        return [{ tag: 'div[data-type="callout"]' }]
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout', class: 'p-6 my-8 bg-black/[0.03] border-l-[4px] border-black/40 rounded-r-xl font-normal text-black leading-relaxed text-[15px]' }), 0]
    },
    addCommands() {
        return {
            setCallout: () => ({ commands }) => {
                return commands.toggleNode(this.name, 'paragraph')
            }
        }
    }
})

export const ReferencesNode = Node.create({
    name: 'references',
    group: 'block',
    content: 'block+',
    defining: true,
    isolating: true,
    selectable: true,
    draggable: true,
    parseHTML() {
        return [
            { tag: 'details[data-type="references"]' },
            { tag: 'div[data-type="references"]' },
        ]
    },
    renderHTML({ HTMLAttributes }) {
        return [
            'details',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'references',
            }),
            [
                'summary',
                {},
                'references',
            ],
            [
                'div',
                { class: 'references-body' },
                0,
            ],
        ]
    },
    addCommands() {
        return {
            insertReferences: () => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: 'add source links, citations, or supporting notes here.' }],
                        },
                    ],
                })
            },
        }
    },
})

// --- Auto-Save Helpers ---
const DRAFT_STORAGE_KEY = 'wim_admin_draft'

interface DraftData {
    title: string
    content: string
    excerpt: string
    category: string
    imageUrl: string
    slug: string
    savedAt: string
}

export function saveDraftToStorage(data: Omit<DraftData, 'savedAt'>) {
    try {
        const draft: DraftData = { ...data, savedAt: new Date().toISOString() }
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch { /* quota exceeded or private mode */ }
}

export function loadDraftFromStorage(): DraftData | null {
    try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
        if (!raw) return null
        return JSON.parse(raw) as DraftData
    } catch { return null }
}

export function clearDraftFromStorage() {
    try { localStorage.removeItem(DRAFT_STORAGE_KEY) } catch { /* noop */ }
}

// --- Toolbar Button ---
interface TBProps {
    active?: boolean
    onClick: () => void
    title?: string
    children: React.ReactNode
}
const TB = ({ active, onClick, title, children }: TBProps) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        className={`p-1.5 rounded-md transition-all active:scale-95 ${active ? 'bg-black text-white shadow-sm' : 'text-black/60 hover:bg-black/10 hover:text-black'}`}
    >
        {children}
    </button>
)

// --- Toolbar ---
const EditorMenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null

    const addLink = () => {
        const url = window.prompt('URL')
        if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        }
    }

    const addImage = () => {
        const url = window.prompt('Image URL')
        if (url) {
            editor.chain().focus().setImage({ src: url }).run()
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-black/[0.06] bg-white/80 backdrop-blur-sm sticky top-0 z-10 sm:gap-1.5">
            <TB active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
                <Bold className="size-4" />
            </TB>
            <TB active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
                <Italic className="size-4" />
            </TB>
            <TB active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
                <UnderlineIcon className="size-4" />
            </TB>
            <TB active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight text">
                <Highlighter className="size-4" />
            </TB>
            <TB active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
                <Code className="size-4" />
            </TB>

            <div className="w-px h-5 bg-black/[0.08] mx-0.5 sm:mx-1" />

            <TB active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
                <Heading2 className="size-4" />
            </TB>
            <TB active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
                <Heading3 className="size-4" />
            </TB>

            <div className="w-px h-5 bg-black/[0.08] mx-0.5 sm:mx-1" />

            <TB active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
                <List className="size-4" />
            </TB>
            <TB active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">
                <ListOrdered className="size-4" />
            </TB>
            <TB active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
                <Quote className="size-4" />
            </TB>
            <TB active={editor.isActive('callout')} onClick={() => (editor.chain().focus() as any).setCallout().run()} title="Callout (Info Box)">
                <MessageSquareWarning className="size-4" />
            </TB>
            <TB active={editor.isActive('references')} onClick={() => (editor.chain().focus() as any).insertReferences().run()} title="Sources & References">
                <BookMarked className="size-4" />
            </TB>
            <TB active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
                <Terminal className="size-4" />
            </TB>
            <TB active={editor.isActive('table')} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
                <TableIcon className="size-4" />
            </TB>

            <div className="w-px h-5 bg-black/[0.08] mx-0.5 sm:mx-1" />

            <TB active={editor.isActive('link')} onClick={addLink} title="Link">
                <LinkIcon className="size-4" />
            </TB>
            <TB onClick={addImage} title="Image">
                <ImageIcon className="size-4" />
            </TB>

            <div className="hidden md:flex items-center">
                <div className="w-px h-5 bg-black/[0.08] mx-1" />
                <TB onClick={() => editor.chain().focus().undo().run()} title="Undo">
                    <Undo className="size-4" />
                </TB>
                <TB onClick={() => editor.chain().focus().redo().run()} title="Redo">
                    <Redo className="size-4" />
                </TB>
            </div>
        </div>
    )
}

// --- Word Count ---
function getWordCount(html: string): number {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!text) return 0
    return text.split(' ').length
}

function getReadingTime(wordCount: number): string {
    const minutes = Math.ceil(wordCount / 200)
    return `${minutes} min`
}

// --- Main Editor ---
interface RichTextEditorProps {
    content: string
    onChange: (content: string) => void
    focusMode?: boolean
    onToggleFocusMode?: () => void
}

const RichTextEditor = ({ content, onChange, focusMode = false, onToggleFocusMode }: RichTextEditorProps) => {
    const [showPreview, setShowPreview] = useState(false)
    const [lastSaved, setLastSaved] = useState<string | null>(null)
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            Placeholder.configure({
                placeholder: 'yazmaya başlayın...',
            }),
            Link.configure({
                openOnClick: false,
            }),
            Image,
            Highlight.configure({
                HTMLAttributes: {
                    style: 'background-color: rgba(0, 0, 0, 0.08); color: black; border-radius: 4px; padding: 2px 4px;',
                },
            }),
            Underline,
            Subscript,
            Superscript,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            CodeBlockLowlight.configure({
                lowlight,
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            CalloutNode,
            ReferencesNode,
        ],
        content: content,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            onChange(html)

            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
            autoSaveTimerRef.current = setTimeout(() => {
                setLastSaved(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
            }, 2000)
        },
        editorProps: {
            attributes: {
                class: `prose prose-sm max-w-none focus:outline-none px-6 py-8 font-sans ${focusMode ? 'min-h-[80vh] text-lg' : 'min-h-[400px] text-base'} text-black leading-relaxed prose-headings:text-black prose-headings:font-normal prose-headings:tracking-tight prose-p:text-black prose-p:leading-relaxed prose-strong:text-black prose-strong:font-semibold prose-a:text-black prose-a:underline prose-a:underline-offset-4 prose-a:decoration-black/20 hover:prose-a:decoration-black prose-code:text-black prose-code:bg-black/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-black/[0.03] prose-pre:text-black prose-pre:border prose-pre:border-black/10 prose-blockquote:text-black/70 prose-blockquote:border-black/10 prose-blockquote:bg-black/[0.02] prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-lg prose-blockquote:font-normal prose-blockquote:not-italic prose-li:text-black prose-td:border-black/10 prose-th:border-black/10 prose-th:text-black prose-th:font-normal prose-hr:border-black/10 transition-all select-all`,
            },
        },
    })

    // Sync content from parent
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
        }
    }, [])

    // Keyboard shortcut: Ctrl+Shift+F for focus mode
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'F') {
            e.preventDefault()
            onToggleFocusMode?.()
        }
    }, [onToggleFocusMode])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    const wordCount = getWordCount(content)

    // On mobile, disable split preview
    const canShowPreview = showPreview

    return (
        <div className={`border border-[#1E2F46]/15 rounded-sm bg-white overflow-hidden flex flex-col ${focusMode ? 'h-full' : 'h-full'}`}>
            {/* Toolbar Row */}
            <div className="flex items-center justify-between border-b border-[#1E2F46]/10 bg-[#f8f9fb]">
                <EditorMenuBar editor={editor} />
                <div className="flex items-center gap-0.5 pr-1.5">
                    {/* Preview Toggle - hidden on small screens */}
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`hidden sm:flex p-1.5 rounded transition-colors ${showPreview ? 'bg-[#1E2F46] text-white' : 'text-[#1E2F46]/50 hover:bg-[#1E2F46]/10 hover:text-[#1E2F46]'}`}
                        title={showPreview ? 'Hide Preview' : 'Show Preview'}
                    >
                        {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>

                    {/* Focus Mode Toggle */}
                    {onToggleFocusMode && (
                        <button
                            onClick={onToggleFocusMode}
                            className={`p-1.5 rounded transition-colors ${focusMode ? 'bg-[#1E2F46] text-white' : 'text-[#1E2F46]/50 hover:bg-[#1E2F46]/10 hover:text-[#1E2F46]'}`}
                            title={focusMode ? 'Exit Focus (Ctrl+Shift+F)' : 'Focus Mode (Ctrl+Shift+F)'}
                        >
                            {focusMode ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Editor + Preview */}
            <div className={`flex-1 flex ${canShowPreview ? 'flex-row' : 'flex-col'} min-h-0 overflow-hidden`}>
                {/* Editor */}
                <div className={`${canShowPreview ? 'w-1/2 border-r border-[#1E2F46]/10' : 'w-full'} overflow-auto bg-white`}>
                    <EditorContent editor={editor} />
                </div>

                {/* Live Preview */}
                {canShowPreview && (
                    <div className="w-1/2 overflow-auto bg-[#f8f9fb] border-l border-[#1E2F46]/10 px-5 py-4">
                        <div className="text-[9px] font-black uppercase tracking-widest text-black/30 mb-4 select-none">canlı önizleme</div>
                        <div
                            className="prose prose-sm max-w-none prose-stone text-black prose-headings:text-black prose-p:text-black prose-strong:text-black prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-code:text-black prose-code:bg-black/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-black/5 prose-pre:text-black prose-pre:border prose-pre:border-black/10 prose-blockquote:text-black/80 prose-blockquote:border-black/20 prose-blockquote:font-normal prose-blockquote:not-italic prose-li:text-black prose-td:border-black/10 prose-th:border-black/10 prose-th:text-black prose-hr:border-black/10"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-2.5 py-1 border-t border-[#1E2F46]/10 bg-[#f8f9fb] text-[9px] font-bold tracking-wide lowercase text-[#1E2F46]/35">
                <div className="flex items-center gap-2">
                    <span>{wordCount} words</span>
                    <span>·</span>
                    <span>{getReadingTime(wordCount)}</span>
                </div>
                {lastSaved && (
                    <span className="flex items-center gap-1 text-[#1E2F46]/45">
                        <Save className="size-2" />
                        saved {lastSaved}
                    </span>
                )}
            </div>
        </div>
    )
}

export default RichTextEditor
