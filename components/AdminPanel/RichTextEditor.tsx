"use client"

import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import {
    Bold, Italic, List, ListOrdered, Quote, Heading1, Heading2,
    Link as LinkIcon, Image as ImageIcon, Undo, Redo, Code
} from 'lucide-react'
import OSButton from 'components/OSButton'

const MenuBar = ({ editor }: { editor: any }) => {
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
        { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: 'bold' },
        { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: 'italic' },
        { icon: Code, action: () => editor.chain().focus().toggleCode().run(), active: 'code' },
        { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: 'heading', params: { level: 1 } },
        { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: 'heading', params: { level: 2 } },
        { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: 'bulletList' },
        { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: 'orderedList' },
        { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: 'blockquote' },
        { icon: LinkIcon, action: addLink, active: 'link' },
        { icon: ImageIcon, action: addImage },
        { icon: Undo, action: () => editor.chain().focus().undo().run() },
        { icon: Redo, action: () => editor.chain().focus().redo().run() },
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
                    <item.icon className={`size-3.5 ${item.active && editor.isActive(item.active, item.params) ? 'text-white' : 'text-navy'}`} />
                </OSButton>
            ))}
        </div>
    )
}

const RichTextEditor = ({ content, onChange }: { content: string, onChange: (content: string) => void }) => {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Yazmaya başlayın...',
            }),
            Link.configure({
                openOnClick: false,
            }),
            Image,
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none p-4 min-h-[300px] text-primary',
            },
        },
    })

    return (
        <div className="border border-primary rounded bg-white overflow-hidden shadow-inner flex flex-col h-full">
            <MenuBar editor={editor} />
            <div className="flex-1 overflow-auto">
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}

export default RichTextEditor
