"use client"

import React, { useEffect, useCallback } from 'react'
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

import { IconApps, IconBookmark, IconCheckCircle, IconCollapse, IconDownload, IconEllipsis, IconExpand, IconExternal, IconGear, IconImage, IconList, IconMinus, IconMinusSmall, IconPencil, IconQuote, IconRedo, IconSpinner, IconTerminal, IconTextWidth, IconTextWidthFixed, IconUndo, IconWarning } from '@posthog/icons';

import Toolbar, { ToolbarElement } from 'components/RadixUI/Toolbar'
import { Toolkit } from '../Toolkit'
import { useApp } from '../../context/App'
import { LemonButton } from 'components/LemonUI'
import { Popover } from 'components/RadixUI/Popover'
import { CalloutType } from 'components/editor/callout-extension'

// Initialize lowlight for code blocks
const lowlight = createLowlight(common)

import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        callout: {
            setCallout: (attrs?: { type: CalloutType }) => ReturnType
            toggleCallout: (attrs?: { type: CalloutType }) => ReturnType
            unsetCallout: () => ReturnType
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
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout', class: 'p-6 my-8 bg-white/60 supports-[backdrop-filter]:backdrop-blur-[60px] border border-black/5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-[24px] font-normal text-black leading-relaxed text-[15px] transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.06)] hover:-translate-y-0.5' }), 0]
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

// --- Main Editor ---
interface RichTextEditorProps {
    content: string
    onChange: (content: string) => void
    focusMode?: boolean
    onToggleFocusMode?: () => void
    onSaveDraft?: () => void
    onPublish?: () => void
    isSaving?: boolean
    isPublished?: boolean
    isSaved?: boolean
    leftElements?: ToolbarElement[]
    extraElements?: ToolbarElement[]
    toolkitPosition?: 'header' | 'footer'
    windowKey?: string
    placeholder?: string
    hideBorder?: boolean
    expandHeight?: boolean
}

const RichTextEditor = ({
    content,
    onChange,
    focusMode = false,
    onToggleFocusMode,
    onSaveDraft,
    onPublish,
    isSaving = false,
    isPublished = false,
    isSaved = false,
    leftElements = [],
    extraElements = [],
    toolkitPosition = 'footer',
    windowKey,
    placeholder,
    hideBorder = false,
    expandHeight = false
}: RichTextEditorProps) => {
    const { focusedWindow, isMobile } = useApp()
    const targetKey = windowKey || focusedWindow?.key

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            Placeholder.configure({
                placeholder: placeholder || 'type here...',
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
        },
        editorProps: {
            attributes: {
                class: `focus:outline-none min-h-[80px] md:min-h-[120px] max-h-[250px] md:max-h-[350px] overflow-y-auto p-3 prose prose-sm dark:prose-invert max-w-none text-black dark:text-white [&_p]:text-black [&_p]:dark:text-white focus:[&_p]:!text-black focus:[&_p]:dark:!text-white [&_a]:font-semibold break-words [overflow-wrap:anywhere]`,
            },
        },
    })

    const toolbarElements: ToolbarElement[] = editor ? [
        ...leftElements,
        ...(leftElements.length > 0 ? [{ type: 'separator' } as ToolbarElement] : []),
        {
            type: 'button',
            label: 'undo',
            icon: <IconUndo className="size-4" />,
            hideLabel: true,
            onClick: () => editor.chain().focus().undo().run(),
            disabled: !editor.can().undo(),
        },
        {
            type: 'button',
            label: 'redo',
            icon: <IconRedo className="size-4" />,
            hideLabel: true,
            onClick: () => editor.chain().focus().redo().run(),
            disabled: !editor.can().redo(),
        },
        { type: 'separator' },
        {
            type: 'button',
            label: 'bold',
            icon: <IconTextWidthFixed className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('bold'),
            onClick: () => editor.chain().focus().toggleBold().run(),
        },
        {
            type: 'button',
            label: 'italic',
            icon: <IconMinusSmall className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('italic'),
            onClick: () => editor.chain().focus().toggleItalic().run(),
        },
        {
            type: 'button',
            label: 'underline',
            icon: <IconMinus className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('underline'),
            onClick: () => editor.chain().focus().toggleUnderline().run(),
        },
        {
            type: 'button',
            label: 'highlight',
            icon: <IconPencil className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('highlight'),
            onClick: () => editor.chain().focus().toggleHighlight().run(),
        },
        { type: 'separator' },
        {
            type: 'button',
            label: 'H2',
            icon: <IconTextWidth className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('heading', { level: 2 }),
            onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
            type: 'button',
            label: 'H3',
            icon: <IconTextWidth className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('heading', { level: 3 }),
            onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        },
        { type: 'separator' },
        {
            type: 'button',
            label: 'Bullet List',
            icon: <IconList className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('bulletList'),
            onClick: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
            type: 'button',
            label: 'Ordered List',
            icon: <IconList className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('orderedList'),
            onClick: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
            type: 'button',
            label: 'Quote',
            icon: <IconQuote className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('blockquote'),
            onClick: () => editor.chain().focus().toggleBlockquote().run(),
        },
        { type: 'separator' },
        {
            type: 'button',
            label: 'Callout',
            icon: <IconWarning className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('callout'),
            onClick: () => (editor.chain().focus() as unknown as { setCallout: () => { run: () => void } }).setCallout().run(),
        },
        {
            type: 'button',
            label: 'References',
            icon: <IconBookmark className="size-4 text-black" />,
            hideLabel: true,
            active: editor.isActive('references'),
            onClick: () => (editor.chain().focus() as unknown as { insertReferences: () => { run: () => void } }).insertReferences().run(),
        },
        {
            type: 'container' as const,
            className: isMobile ? 'hidden' : 'flex items-center gap-0.5',
            children: (
                <div className="flex items-center gap-0.5">
                    <Toolbar
                        elements={[
                            {
                                type: 'button',
                                label: 'Link',
                                icon: <IconExternal className="size-4 text-black" />,
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
                                icon: <IconImage className="size-4 text-black" />,
                                hideLabel: true,
                                onClick: () => {
                                    const url = window.prompt('Image URL')
                                    if (url) editor.chain().focus().setImage({ src: url }).run()
                                },
                            },
                        ]}
                        className="!bg-transparent !border-none !p-0"
                    />
                </div>
            )
        },
        ...(isMobile ? [
            {
                type: 'container' as const,
                children: (
                    <Popover
                        trigger={
                            <LemonButton size="small">
                                <IconEllipsis className="size-4" />
                            </LemonButton>
                        }
                        dataScheme="primary"
                        contentClassName="w-48 p-1 border border-primary bg-bg"
                    >
                        <div className="flex flex-col gap-0.5">
                            <button
                                onClick={() => {
                                    const url = window.prompt('URL')
                                    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
                                }}
                                className={`text-left px-2 py-2 text-xs font-bold rounded-[24px] flex items-center gap-2 hover:bg-black/5 ${editor.isActive('link') ? 'bg-black/5' : ''}`}
                            >
                                <IconExternal className="size-4" /> add link
                            </button>
                            <button
                                onClick={() => {
                                    const url = window.prompt('Image URL')
                                    if (url) editor.chain().focus().setImage({ src: url }).run()
                                }}
                                className="text-left px-2 py-2 text-xs font-bold rounded-[24px] flex items-center gap-2 hover:bg-black/5"
                            >
                                <IconImage className="size-4" /> add image
                            </button>
                            <div className="h-px bg-primary/10 my-0.5" />
                            <button
                                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                                className={`text-left px-2 py-2 text-xs font-bold rounded-[24px] flex items-center gap-2 hover:bg-black/5 ${editor.isActive('codeBlock') ? 'bg-black/5' : ''}`}
                            >
                                <IconTerminal className="size-4" /> code block
                            </button>
                            <button
                                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                                className="text-left px-2 py-2 text-xs font-bold rounded-[24px] flex items-center gap-2 hover:bg-black/5"
                            >
                                <IconApps className="size-4" /> insert table
                            </button>
                        </div>
                    </Popover>
                )
            }
        ] : []),
        {
            type: 'container' as const,
            className: 'ml-auto flex items-center gap-1.5',
            children: (
                <div className="flex items-center gap-1.5">
                    {/* Extra Elements from Parent - Grids on mobile */}
                    {isMobile ? (
                        <Popover
                            trigger={
                                <LemonButton size="small">
                                    <IconGear className="size-4" />
                                </LemonButton>
                            }
                            dataScheme="primary"
                            contentClassName="w-56 p-2 border border-primary bg-bg"
                        >
                            <div className="flex flex-col gap-3">
                                <span className="text-[10px] font-black lowercase tracking-widest text-primary/40 px-1">node settings</span>
                                <div className="flex flex-wrap gap-2">
                                    <Toolbar elements={extraElements} className="!bg-transparent !border-none !p-0 !static flex-wrap gap-2" />
                                </div>
                            </div>
                        </Popover>
                    ) : (
                        <Toolbar elements={extraElements} className="!bg-transparent !border-none !p-0 !rounded-none !static" />
                    )}

                    {(onSaveDraft || onPublish) && <div className="h-4 w-[1px] bg-primary/10 mx-1" />}

                    {isSaved && (
                        <span className="text-[10px] font-bold tracking-widest text-green-600 lowercase transition-opacity duration-300 hidden lg:inline mr-1">
                            saved
                        </span>
                    )}

                    {onSaveDraft && (
                        <LemonButton size="small" onClick={onSaveDraft} disabled={isSaving}>
                            <div className="flex items-center gap-1.5 lowercase px-1 font-bold">
                                {isSaving ? <IconSpinner className="size-3.5 animate-spin" /> : <IconDownload className="size-3.5" />}
                                <span className="hidden md:inline px-0.5">save</span>
                            </div>
                        </LemonButton>
                    )}

                    {onPublish && (
                        <LemonButton
                            size="small"
                            onClick={onPublish}
                            disabled={isSaving}
                            className="!bg-primary !text-white hover:!bg-primary/90"
                        >
                            <div className="flex items-center gap-1.5 lowercase px-1 font-bold">
                                <IconCheckCircle className="size-3.5" />
                                <span className="hidden md:inline px-0.5">{isPublished ? 'update' : 'publish'}</span>
                            </div>
                        </LemonButton>
                    )}

                    {onToggleFocusMode && (
                        <div className="flex items-center ml-1 border-l border-primary/10 pl-1.5">
                            <button
                                onClick={onToggleFocusMode}
                                className={`p-1.5 rounded-[16px] transition-colors ${focusMode ? 'bg-black text-white' : 'text-black/40 hover:bg-black/10 hover:text-black'}`}
                                title={focusMode ? 'Exit Focus' : 'Focus Mode'}
                            >
                                {focusMode ? <IconCollapse className="size-4" /> : <IconExpand className="size-4" />}
                            </button>
                        </div>
                    )}
                </div>
            ),
        }
    ] : []

    // Sync content from parent
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

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

    return (
        <div className={`${hideBorder ? 'bg-transparent overflow-hidden flex flex-col' : `border border-black/5 rounded-[32px] bg-white/80 supports-[backdrop-filter]:backdrop-blur-[60px] shadow-[0_12px_48px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]`} ${focusMode ? 'h-[100dvh] fixed inset-0 z-[100] !rounded-none' : (expandHeight ? 'h-auto' : 'h-full')}`}>
            {/* Toolkit - injected into Window Footer or Header via portal */}
            <Toolkit
                windowKey={windowKey || targetKey}
                position={toolkitPosition}
                className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${editor?.isFocused ? 'opacity-100 scale-100 translate-y-0' : 'opacity-40 hover:opacity-100 focus-within:opacity-100 hover:scale-[1.02] focus-within:scale-[1.02] translate-y-1'}`}
            >
                <Toolbar
                    elements={toolbarElements}
                    className="!bg-white/80 supports-[backdrop-filter]:backdrop-blur-[60px] !border !border-black/5 !p-2 !rounded-full flex-wrap w-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] gap-1"
                />
            </Toolkit>

            {/* Editor */}
            <div
                className={`${expandHeight ? 'bg-transparent cursor-text' : (hideBorder ? 'flex-1 overflow-auto bg-transparent min-h-0 cursor-text' : 'flex-1 overflow-auto bg-white min-h-0 cursor-text')}`}
                onClick={() => editor?.chain().focus().run()}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}

export default RichTextEditor
