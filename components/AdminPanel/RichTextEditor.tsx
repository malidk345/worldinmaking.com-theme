"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import {
    Bold, Italic, List, ListOrdered, Quote, Heading1, Heading2, Heading3,
    Link as LinkIcon, Image as ImageIcon, Undo, Redo, Code,
    Maximize2, Minimize2, Eye, EyeOff, Save
} from 'lucide-react'
import OSButton from 'components/OSButton'

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

    const items = [
        { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: 'bold', tooltip: 'Bold (Ctrl+B)' },
        { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: 'italic', tooltip: 'Italic (Ctrl+I)' },
        { icon: Code, action: () => editor.chain().focus().toggleCode().run(), active: 'code', tooltip: 'Code' },
        { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: 'heading', params: { level: 1 }, tooltip: 'Heading 1' },
        { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: 'heading', params: { level: 2 }, tooltip: 'Heading 2' },
        { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: 'heading', params: { level: 3 }, tooltip: 'Heading 3' },
        { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: 'bulletList', tooltip: 'Bullet List' },
        { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: 'orderedList', tooltip: 'Ordered List' },
        { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: 'blockquote', tooltip: 'Blockquote' },
        { icon: LinkIcon, action: addLink, active: 'link', tooltip: 'Insert Link (Ctrl+K)' },
        { icon: ImageIcon, action: addImage, tooltip: 'Insert Image' },
        { icon: Undo, action: () => editor.chain().focus().undo().run(), tooltip: 'Undo (Ctrl+Z)' },
        { icon: Redo, action: () => editor.chain().focus().redo().run(), tooltip: 'Redo (Ctrl+Shift+Z)' },
    ]

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b border-primary bg-accent/5">
            {items.map((item, index) => (
                <OSButton
                    key={index}
                    size="xs"
                    variant={item.active && editor.isActive(item.active, item.params) ? 'primary' : 'secondary'}
                    onClick={item.action}
                    className="p-1"
                >
                    <item.icon className={`size-3.5 ${item.active && editor.isActive(item.active, item.params) ? 'text-white' : 'text-primary'}`} />
                </OSButton>
            ))}
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
    return `${minutes} min read`
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
            StarterKit,
            Placeholder.configure({
                placeholder: 'yazmaya başlayın...',
            }),
            Link.configure({
                openOnClick: false,
            }),
            Image,
        ],
        content: content,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            onChange(html)

            // Auto-save debounce: save draft 2 seconds after last edit
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
            autoSaveTimerRef.current = setTimeout(() => {
                setLastSaved(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
            }, 2000)
        },
        editorProps: {
            attributes: {
                class: `prose prose-sm max-w-none focus:outline-none p-4 ${focusMode ? 'min-h-[70vh] text-base' : 'min-h-[300px]'} text-black dark:text-white dark:prose-invert`,
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

    return (
        <div className={`border border-primary rounded bg-primary overflow-hidden shadow-inner flex flex-col ${focusMode ? 'h-full' : 'h-full'}`}>
            {/* Toolbar Row */}
            <div className="flex items-center justify-between border-b border-primary bg-accent/5">
                <EditorMenuBar editor={editor} />
                <div className="flex items-center gap-1 pr-2">
                    {/* Preview Toggle */}
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`p-1.5 rounded transition-colors ${showPreview ? 'bg-accent/30 text-primary' : 'hover:bg-accent/10 text-primary/60'}`}
                        title={showPreview ? 'Hide Preview' : 'Show Preview'}
                    >
                        {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>

                    {/* Focus Mode Toggle */}
                    {onToggleFocusMode && (
                        <button
                            onClick={onToggleFocusMode}
                            className={`p-1.5 rounded transition-colors ${focusMode ? 'bg-accent/30 text-primary' : 'hover:bg-accent/10 text-primary/60'}`}
                            title={focusMode ? 'Exit Focus Mode (Ctrl+Shift+F)' : 'Focus Mode (Ctrl+Shift+F)'}
                        >
                            {focusMode ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Editor + Preview */}
            <div className={`flex-1 flex ${showPreview ? 'flex-row' : 'flex-col'} min-h-0 overflow-hidden`}>
                {/* Editor */}
                <div className={`${showPreview ? 'w-1/2 border-r border-primary' : 'w-full'} overflow-auto bg-primary`}>
                    <EditorContent editor={editor} />
                </div>

                {/* Live Preview */}
                {showPreview && (
                    <div className="w-1/2 overflow-auto bg-primary p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-3">preview</div>
                        <div
                            className="prose prose-sm max-w-none dark:prose-invert text-black dark:text-white"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-primary bg-accent/5 text-[10px] font-bold tracking-wide lowercase">
                <div className="flex items-center gap-3 opacity-50">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>{getReadingTime(wordCount)}</span>
                </div>
                <div className="flex items-center gap-2">
                    {lastSaved && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Save className="size-2.5" />
                            draft saved {lastSaved}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

export default RichTextEditor
