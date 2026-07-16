"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CharacterCount from '@tiptap/extension-character-count'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import { useDropzone } from 'react-dropzone'

import { AnimatePresence, motion } from 'framer-motion'
import { IconCode, IconExternal, IconFeatures, IconImage, IconList, IconMinus, IconMinusSmall, IconMinusSquare, IconPencil, IconQuote, IconRedo, IconTerminal, IconTextWidth, IconTextWidthFixed, IconUndo, IconX } from '@posthog/icons';


import ForumAvatar from './ForumAvatar'
import MarkdownLogo from './MarkdownLogo'


interface ToolbarButton {
    name: string
    icon: React.ReactNode
    tooltipContent: string
    action: (editor: Editor) => void
    isActive: (editor: Editor) => boolean
    canExecute?: (editor: Editor) => boolean
    separator?: boolean
}

const buttons: ToolbarButton[] = [
    {
        name: 'undo',
        icon: <IconUndo className="size-4" />,
        tooltipContent: 'Undo',
        action: (editor) => editor.chain().focus().undo().run(),
        isActive: () => false,
        canExecute: (editor) => editor.can().undo(),
    },
    {
        name: 'redo',
        icon: <IconRedo className="size-4" />,
        tooltipContent: 'Redo',
        action: (editor) => editor.chain().focus().redo().run(),
        isActive: () => false,
        canExecute: (editor) => editor.can().redo(),
    },
    {
        name: 'sep1',
        icon: null,
        tooltipContent: '',
        action: () => {},
        isActive: () => false,
        separator: true,
    },
    {
        name: 'bold',
        icon: <IconTextWidthFixed className="size-4" />,
        tooltipContent: 'Bold',
        action: (editor) => editor.chain().focus().toggleBold().run(),
        isActive: (editor) => editor.isActive('bold'),
    },
    {
        name: 'italic',
        icon: <IconMinusSmall className="size-4" />,
        tooltipContent: 'Italic',
        action: (editor) => editor.chain().focus().toggleItalic().run(),
        isActive: (editor) => editor.isActive('italic'),
    },
    {
        name: 'underline',
        icon: <IconMinus className="size-4" />,
        tooltipContent: 'Underline',
        action: (editor) => editor.chain().focus().toggleUnderline().run(),
        isActive: (editor) => editor.isActive('underline'),
    },
    {
        name: 'strike',
        icon: <IconMinusSquare className="size-4" />,
        tooltipContent: 'Strikethrough',
        action: (editor) => editor.chain().focus().toggleStrike().run(),
        isActive: (editor) => editor.isActive('strike'),
    },
    {
        name: 'highlight',
        icon: <IconPencil className="size-4" />,
        tooltipContent: 'Highlight',
        action: (editor) => editor.chain().focus().toggleHighlight().run(),
        isActive: (editor) => editor.isActive('highlight'),
    },
    {
        name: 'sep2',
        icon: null,
        tooltipContent: '',
        action: () => {},
        isActive: () => false,
        separator: true,
    },
    {
        name: 'h1',
        icon: <IconTextWidth className="size-4" />,
        tooltipContent: 'Heading 1',
        action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: (editor) => editor.isActive('heading', { level: 1 }),
    },
    {
        name: 'h2',
        icon: <IconTextWidth className="size-4" />,
        tooltipContent: 'Heading 2',
        action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: (editor) => editor.isActive('heading', { level: 2 }),
    },
    {
        name: 'sep3',
        icon: null,
        tooltipContent: '',
        action: () => {},
        isActive: () => false,
        separator: true,
    },
    {
        name: 'bulletList',
        icon: <IconList className="size-4" />,
        tooltipContent: 'Bullet List',
        action: (editor) => editor.chain().focus().toggleBulletList().run(),
        isActive: (editor) => editor.isActive('bulletList'),
    },
    {
        name: 'orderedList',
        icon: <IconList className="size-4" />,
        tooltipContent: 'Ordered List',
        action: (editor) => editor.chain().focus().toggleOrderedList().run(),
        isActive: (editor) => editor.isActive('orderedList'),
    },
    {
        name: 'blockquote',
        icon: <IconQuote className="size-4" />,
        tooltipContent: 'Blockquote',
        action: (editor) => editor.chain().focus().toggleBlockquote().run(),
        isActive: (editor) => editor.isActive('blockquote'),
    },
    {
        name: 'sep4',
        icon: null,
        tooltipContent: '',
        action: () => {},
        isActive: () => false,
        separator: true,
    },
    {
        name: 'code',
        icon: <IconCode className="size-4" />,
        tooltipContent: 'Inline Code',
        action: (editor) => editor.chain().focus().toggleCode().run(),
        isActive: (editor) => editor.isActive('code'),
    },
    {
        name: 'codeBlock',
        icon: <IconTerminal className="size-4" />,
        tooltipContent: 'Code Block',
        action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
        isActive: (editor) => editor.isActive('codeBlock'),
    },
    {
        name: 'horizontalRule',
        icon: <IconMinus className="size-4" />,
        tooltipContent: 'Horizontal Rule',
        action: (editor) => editor.chain().focus().setHorizontalRule().run(),
        isActive: () => false,
    },
    {
        name: 'sep5',
        icon: null,
        tooltipContent: '',
        action: () => {},
        isActive: () => false,
        separator: true,
    },
    {
        name: 'link',
        icon: <IconExternal className="size-4" />,
        tooltipContent: 'Link',
        action: (editor) => {
            const url = window.prompt('URL')
            if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        },
        isActive: (editor) => editor.isActive('link'),
    },
    {
        name: 'image',
        icon: <IconImage className="size-4" />,
        tooltipContent: 'Image',
        action: (editor) => {
            const url = window.prompt('Image URL')
            if (url) editor.chain().focus().setImage({ src: url }).run()
        },
        isActive: () => false,
    },
]

interface ForumRichTextProps {
    initialValue?: string
    setFieldValue: (key: string, value: string) => void
    autoFocus?: boolean
    onSubmit?: () => void
    maxLength?: number
    bodyKey?: string
    className?: string
    cta?: React.ReactNode | (() => React.ReactNode)
    placeholder?: string
    boxed?: boolean
    label?: string
    mentions?: boolean
    borderClass?: string
    showMarkdownLogo?: boolean
    expandHeight?: boolean
    wrapperClassName?: string
}

interface Profile {
    id: string
    username: string
    avatar_url: string
}

// Mock profiles for mentions
const MOCK_PROFILES: Profile[] = [
    { id: 'max', username: 'max', avatar_url: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/james.png' },
    { id: '1', username: 'james', avatar_url: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/james.png' },
    { id: '2', username: 'tim', avatar_url: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/tim.png' },
]

const MentionProfile = ({ profile, onSelect, index, focused }: { profile: Profile; onSelect?: (profile: Profile) => void; index: number; focused: number }) => {
    return (
        <li>
            <button
                onClick={() => onSelect?.(profile)}
                type="button"
                className={`w-full text-left px-3 py-2 rounded-[14px] transition-colors flex items-center gap-3 ${focused === index ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-black/10 dark:border-white/10">
                    <ForumAvatar className="w-full h-full" image={profile.avatar_url} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <p className="m-0 font-bold text-sm text-primary truncate lowercase">{profile.username}</p>
                        {profile.id === 'max' && <IconFeatures className="w-3.5 h-3.5 text-primary opacity-50 shrink-0" />}
                    </div>
                    <p className="m-0 text-[10px] font-medium opacity-50 truncate lowercase tracking-wide">{profile.id}</p>
                </div>
            </button>
        </li>
    )
}

const MentionProfiles = ({ onSelect, onClose, search = '' }: { onSelect?: (profile: Profile) => void; onClose?: () => void; search: string }) => {
    const filteredProfiles = MOCK_PROFILES.filter(p => p.username.toLowerCase().includes(search.toLowerCase()))
    const [focused, setFocused] = useState(0)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setFocused((prev) => (prev + 1) % Math.max(1, filteredProfiles.length))
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setFocused((prev) => (prev - 1 + filteredProfiles.length) % Math.max(1, filteredProfiles.length))
            }
            if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault()
                if (filteredProfiles[focused]) onSelect?.(filteredProfiles[focused])
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [focused, filteredProfiles, onSelect])

    return (
        <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{ willChange: 'auto' }}
            className="absolute left-2 top-2 z-50 w-[240px] max-h-[200px] flex flex-col bg-white/80 dark:bg-black/80 supports-[backdrop-filter]:backdrop-blur-[60px] border border-black/10 dark:border-white/10 rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden"
        >
            <div className="flex justify-between items-center px-3 py-2 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                <span className="text-[10px] font-bold lowercase opacity-50 tracking-wider">mentions</span>
                <button onClick={onClose} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors">
                    <IconX className="w-3 h-3 text-primary" />
                </button>
            </div>
            <ul className="m-0 p-0 list-none overflow-y-auto flex-1 p-1 space-y-0.5">
                {filteredProfiles.map((profile, index) => (
                    <MentionProfile
                        focused={focused}
                        index={index}
                        onSelect={onSelect}
                        profile={profile}
                        key={profile.id}
                    />
                ))}
                {filteredProfiles.length === 0 && (
                    <li className="p-3 text-xs opacity-50 text-center">No results</li>
                )}
            </ul>
        </motion.div>
    )
}

export default function ForumRichText({
    initialValue = '',
    setFieldValue,

    bodyKey = 'body',
    className = '',
    cta = null,
    placeholder = 'Type more details...',
    boxed = true,
    label = '',
    mentions = true,
    borderClass = 'border-border',
    showMarkdownLogo = false,
    expandHeight = false,
    wrapperClassName = '',
}: ForumRichTextProps) {
    const [showMentionProfiles, setShowMentionProfiles] = useState(false)
    const [mentionSearch, setMentionSearch] = useState('')

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder,
            }),
            Link.configure({
                openOnClick: false,
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-[12px] max-w-full h-auto my-4 border border-primary/20',
                },
            }),
            CharacterCount,
            Highlight.configure({
                HTMLAttributes: {
                    style: 'background-color: rgba(0, 0, 0, 0.08); color: black; border-radius: 4px; padding: 2px 4px;',
                },
            }),
            Underline,
        ],
        content: initialValue,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            setFieldValue(bodyKey, html)

            // Mention detection logic
            const { from } = editor.state.selection
            const textBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from)
            const mentionMatch = textBefore.match(/@(\w*)$/)
            if (mentionMatch) {
                setMentionSearch(mentionMatch[1])
                setShowMentionProfiles(true)
            } else {
                setShowMentionProfiles(false)
            }
        },
        editorProps: {
            attributes: {
                // Exact styling from aa project's OSTextarea but applied to Tiptap
                class: `focus:outline-none overflow-y-auto p-3 prose dark:prose-invert max-w-none text-black dark:text-white [&_p]:text-black [&_p]:dark:text-white focus:[&_p]:!text-black focus:[&_p]:dark:!text-white [&_a]:font-semibold break-words [overflow-wrap:anywhere] text-[13px] leading-[1.4] tracking-tight [&_p]:pb-1.5 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 ${expandHeight ? 'flex-1 h-full min-h-0' : 'min-h-[80px] md:min-h-[120px] max-h-[250px] md:max-h-[350px]'} ${className}`,
            },
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || [])
                const image = items.find(item => item.type.startsWith('image/'))
                if (image) {
                    const file = image.getAsFile()
                    if (file) {
                        onDrop([file])
                        return true
                    }
                }
                return false
            }
        },
        immediatelyRender: false,
    })

    useEffect(() => {
        if (editor && initialValue !== editor.getHTML()) {
            editor.commands.setContent(initialValue)
        }
    }, [initialValue, editor])

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            const file = acceptedFiles[0]
            if (!file || !editor) return

            // editor.chain().focus().setImage({ src: fakeImagePath }).run()
        },
        [editor]
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true,
        multiple: false,
        accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/gif': ['.gif'] },
    })

    const handleProfileSelect = (profile: Profile) => {
        if (!editor) return

        const { from } = editor.state.selection
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from)
        const match = textBefore.match(/@(\w*)$/)

        if (match) {
            const start = from - match[0].length
            const mentionText = profile.id === 'max' ? `@max ` : `@${profile.username.toLowerCase().replace(' ', '_')}/${profile.id} `

            editor.chain()
                .focus()
                .insertContentAt({ from: start, to: from }, mentionText)
                .run()
        }

        setShowMentionProfiles(false)
    }

    if (!editor) return null

    return (
        <div className={`relative bg-white/60 dark:bg-black/60 supports-[backdrop-filter]:backdrop-blur-[60px] rounded-[24px] border border-black/5 dark:border-white/5 shadow-inner flex flex-col overflow-hidden w-full max-w-full min-w-0 ${expandHeight ? 'flex-1 h-full min-h-0' : ''} ${wrapperClassName}`} {...getRootProps()}>
            <input className="hidden" {...getInputProps()} />

            {/* Toolbar - iOS 26 Style - Always visible, scrollable */}
            <div
                className={`not-prose flex items-center p-1.5 md:p-2 ${boxed ? `border-b ${borderClass}/50` : `border-b ${borderClass}/30`} bg-white/50 dark:bg-black/50 overflow-hidden`}
            >
                <div className="flex items-center gap-0.5 w-full overflow-x-auto no-scrollbar pb-0.5 -mb-0.5">
                    {buttons.map((button) => {
                        if (button.separator) {
                            return (
                                <div key={button.name} className="w-[1px] h-5 bg-black/10 dark:bg-white/10 mx-1 shrink-0" />
                            )
                        }

                        const isActive = button.isActive(editor)
                        const isDisabled = button.canExecute ? !button.canExecute(editor) : false

                        return (
                            <button
                                key={button.name}
                                type="button"
                                className={`p-1.5 md:p-2 rounded-[16px] flex items-center justify-center transition-all duration-200 shrink-0
                                    ${isActive
                                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                                        : isDisabled
                                            ? 'text-primary/20 cursor-not-allowed'
                                            : 'text-primary/70 hover:text-primary hover:bg-black/8 dark:hover:bg-white/8'
                                    }`}
                                title={button.tooltipContent}
                                disabled={isDisabled}
                                onClick={(e) => {
                                    e.preventDefault()
                                    button.action(editor)
                                }}
                            >
                                {button.icon}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Editor Area */}
            <div className={`relative bg-transparent transition-colors duration-300 ease-in-out focus-within:bg-white/80 dark:focus-within:bg-black/80 ${expandHeight ? 'flex-grow flex flex-col min-h-0 h-full' : 'min-h-[120px]'}`}>
                <div className={`relative h-full ${expandHeight ? 'flex-grow flex flex-col min-h-0 h-full' : ''}`}>
                    {mentions && (
                        <AnimatePresence>
                            {showMentionProfiles && (
                                <MentionProfiles
                                    search={mentionSearch}
                                    onClose={() => setShowMentionProfiles(false)}
                                    onSelect={handleProfileSelect}
                                />
                            )}
                        </AnimatePresence>
                    )}
                    {label && !!editor.getHTML() && (
                        <label className="text-[10px] opacity-40 block font-bold mb-1 px-4 pt-3 lowercase tracking-wide">{label}</label>
                    )}
                    <EditorContent editor={editor} className={expandHeight ? 'flex-1 flex flex-col min-h-0 h-full' : ''} />
                </div>

                {isDragActive && (
                    <div className="bg-white/80 dark:bg-black/80 supports-[backdrop-filter]:backdrop-blur-[40px] z-10 flex items-center justify-center absolute w-full h-full inset-0 p-4">
                        <div className="border-2 border-dashed border-primary/20 rounded-[16px] w-full h-full flex items-center justify-center bg-black/5 dark:bg-white/5">
                            <p className="m-0 font-bold lowercase text-primary/60">drop image here</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Bar */}
            <div className="flex justify-between items-center p-2 md:p-3 border-t border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/40">
                <div className="flex gap-2 items-center">
                    {cta ? (typeof cta === 'function' ? cta() : cta) : <div />}
                </div>
                <aside className="flex items-center gap-3">
                    <span className="text-[10px] font-bold opacity-40 text-primary lowercase tracking-wider">
                        {editor.storage.characterCount.words()} words
                    </span>
                    {showMarkdownLogo && (
                        <a
                            className="text-primary/20 hover:text-primary/60 transition-all duration-300"
                            href="https://www.markdownguide.org/cheat-sheet/"
                            target="_blank"
                            rel="noreferrer"
                            title="supports markdown syntax"
                        >
                            <MarkdownLogo />
                        </a>
                    )}
                </aside>
            </div>
        </div>
    )
}
