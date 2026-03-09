"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { createLowlight, common } from 'lowlight'
import 'highlight.js/styles/github.css' // Light mode theme to prevent white text

import {
    Bold, Italic, List, ListOrdered, Quote, Heading2, Heading3,
    Link as LinkIcon, Image as ImageIcon, Undo, Redo,
    Maximize2, Minimize2, Eye, EyeOff, Save,
    Underline as UnderlineIcon, Highlighter,
    Terminal, Table as TableIcon, MessageSquareWarning, BookMarked
} from 'lucide-react'

import { Toolbar, ToolbarElement } from 'components/RadixUI/Toolbar'
import { Toolkit, ToolkitSection } from 'components/Toolkit'
import { useApp } from 'context/App'

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

// --- Draft Helpers ---

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
    actions?: React.ReactNode
}

const RichTextEditor = ({ content, onChange, focusMode = false, onToggleFocusMode, actions }: RichTextEditorProps) => {
    const { focusedWindow } = useApp()
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

    const toolbarElements: ToolbarElement[] = editor ? [
        {
            type: 'button',
            label: 'Undo',
            icon: <Undo className="size-4" />,
            hideLabel: true,
            onClick: () => editor.chain().focus().undo().run(),
            disabled: !editor.can().undo(),
        },
        {
            type: 'button',
            label: 'Redo',
            icon: <Redo className="size-4" />,
            hideLabel: true,
            onClick: () => editor.chain().focus().redo().run(),
            disabled: !editor.can().redo(),
        },
        { type: 'separator' },
        {
            type: 'button',
            label: 'Bold',
            icon: <Bold className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('bold'),
            onClick: () => editor.chain().focus().toggleBold().run(),
        },
        {
            type: 'button',
            label: 'Italic',
            icon: <Italic className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('italic'),
            onClick: () => editor.chain().focus().toggleItalic().run(),
        },
        {
            type: 'button',
            label: 'Underline',
            icon: <UnderlineIcon className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('underline'),
            onClick: () => editor.chain().focus().toggleUnderline().run(),
        },
        {
            type: 'button',
            label: 'Highlight',
            icon: <Highlighter className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('highlight'),
            onClick: () => editor.chain().focus().toggleHighlight().run(),
        },
        { type: 'separator' },
        {
            type: 'button',
            label: 'H2',
            icon: <Heading2 className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('heading', { level: 2 }),
            onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
            type: 'button',
            label: 'H3',
            icon: <Heading3 className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('heading', { level: 3 }),
            onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        },
        { type: 'separator' },
        {
            type: 'button',
            label: 'Bullet List',
            icon: <List className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('bulletList'),
            onClick: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
            type: 'button',
            label: 'Ordered List',
            icon: <ListOrdered className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('orderedList'),
            onClick: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
            type: 'button',
            label: 'Quote',
            icon: <Quote className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('blockquote'),
            onClick: () => editor.chain().focus().toggleBlockquote().run(),
        },
        { type: 'separator' },
        {
            type: 'button',
            label: 'Callout',
            icon: <MessageSquareWarning className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('callout'),
            onClick: () => (editor.chain().focus() as unknown as { setCallout: () => { run: () => void } }).setCallout().run(),
        },
        {
            type: 'button',
            label: 'References',
            icon: <BookMarked className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('references'),
            onClick: () => (editor.chain().focus() as unknown as { insertReferences: () => { run: () => void } }).insertReferences().run(),
        },
        {
            type: 'button',
            label: 'Code Block',
            icon: <Terminal className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('codeBlock'),
            onClick: () => editor.chain().focus().toggleCodeBlock().run(),
        },
        {
            type: 'button',
            label: 'Table',
            icon: <TableIcon className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('table'),
            onClick: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        },
        { type: 'separator' },
        {
            type: 'button',
            label: 'Link',
            icon: <LinkIcon className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('link'),
            onClick: () => {
                const url = window.prompt('URL')
                if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
            },
        },
        {
            type: 'button',
            label: 'Image',
            icon: <ImageIcon className="size-4 text-black" />,
            hideLabel: true,
            onClick: () => {
                const url = window.prompt('Image URL')
                if (url) editor.chain().focus().setImage({ src: url }).run()
            },
        },
        {
            type: 'container',
            className: 'ml-auto flex items-center gap-1',
            children: (
                <>
                    {onToggleFocusMode && (
                        <button
                            onClick={onToggleFocusMode}
                            className={`p-1.5 rounded transition-colors ${focusMode ? 'bg-black text-white' : 'text-black/40 hover:bg-black/10 hover:text-black'}`}
                            title={focusMode ? 'Exit Focus' : 'Focus Mode'}
                        >
                            {focusMode ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                        </button>
                    )}
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`p-1.5 rounded transition-colors ${showPreview ? 'bg-black text-white' : 'text-black/40 hover:bg-black/10 hover:text-black'}`}
                        title={showPreview ? 'Hide Preview' : 'Show Preview'}
                    >
                        {showPreview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                </>
            ),
        }
    ] : []

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
        <div className={`border border-[#1E2F46]/15 rounded-sm bg-white overflow-hidden flex flex-col ${focusMode ? 'h-screen fixed inset-0 z-[100]' : 'h-full'}`}>
            {/* Toolkit - injected into Window Footer via portal */}
            <Toolkit windowKey={focusedWindow?.key}>
                <ToolkitSection className="flex-1 min-w-0">
                    <Toolbar elements={toolbarElements} className="min-w-max !bg-transparent !border-none" />
                </ToolkitSection>
                {actions && (
                    <ToolkitSection showSeparator className="shrink-0 bg-white/40 backdrop-blur-sm">
                        {actions}
                    </ToolkitSection>
                )}
            </Toolkit>

            {/* Editor + Preview */}
            <div className={`order-1 flex-1 flex ${canShowPreview ? 'flex-row' : 'flex-col'} min-h-0 overflow-hidden`}>
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
            <div className="order-3 flex items-center justify-between px-2.5 py-1 border-t border-black/[0.08] bg-[#f8f9fb] text-[10px] lowercase text-black/40">
                <div className="flex items-center gap-2">
                    <span className="font-medium bg-black/5 px-1.5 rounded-sm">{wordCount} words</span>
                    <span>·</span>
                    <span>{getReadingTime(wordCount)}</span>
                </div>
                {lastSaved && (
                    <span className="flex items-center gap-1 opacity-60">
                        <Save className="size-2.5" />
                        saved {lastSaved}
                    </span>
                )}
            </div>
        </div>
    )
}

export default RichTextEditor
