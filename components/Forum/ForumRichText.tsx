"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CharacterCount from '@tiptap/extension-character-count'
import { useDropzone } from 'react-dropzone'

import { AnimatePresence, motion } from 'framer-motion'
import { Strikethrough, Heading1, Heading2, List, ListOrdered, Quote, Minus } from 'lucide-react'
import { IconFeatures, IconImage, IconX } from '@posthog/icons'

import ForumAvatar from './ForumAvatar'
import MarkdownLogo from './MarkdownLogo'



const buttons = [
    {
        name: 'bold',
        icon: (
            <svg width="10" height="13" viewBox="0 0 10 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M0.394742 13V0.399999H4.80274C5.69874 0.399999 6.45274 0.584 7.06474 0.952C7.68874 1.308 8.13674 1.796 8.40874 2.416C8.68074 3.036 8.81674 3.72 8.81674 4.468C8.81674 5.38 8.58074 6.124 8.10874 6.7C7.64874 7.276 6.98474 7.624 6.11674 7.744V7.816C7.23274 7.972 8.08474 8.396 8.67274 9.088C9.26074 9.772 9.55474 10.652 9.55474 11.728V11.956H7.13074V11.788C7.13074 11.08 6.92274 10.516 6.50674 10.096C6.10274 9.676 5.48674 9.466 4.65874 9.466H2.81874V13H0.394742ZM2.81874 7.42H4.67074C5.35474 7.42 5.86274 7.236 6.19474 6.868C6.52674 6.488 6.69274 5.968 6.69274 5.308C6.69274 4.54 6.51874 3.968 6.17074 3.592C5.83474 3.204 5.29074 3.01 4.53874 3.01H2.81874V7.42Z"
                    fill="currentColor"
                />
            </svg>
        ),
        tooltipContent: 'Bold',
        action: (editor: Editor) => editor.chain().focus().toggleBold().run(),
        isActive: (editor: Editor) => editor.isActive('bold'),
    },
    {
        name: 'italic',
        icon: (
            <svg width="4" height="13" viewBox="0 0 4 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M0.0360938 13H1.56609L3.00609 3.928H1.47609L0.0360938 13ZM1.63809 2.2H3.40209L3.70809 0.256H1.94409L1.63809 2.2Z"
                    fill="currentColor"
                />
            </svg>
        ),
        tooltipContent: 'Italic',
        action: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
        isActive: (editor: Editor) => editor.isActive('italic'),
    },
    {
        name: 'strike',
        icon: <Strikethrough className="w-4 h-4" />,
        tooltipContent: 'Strikethrough',
        action: (editor: Editor) => editor.chain().focus().toggleStrike().run(),
        isActive: (editor: Editor) => editor.isActive('strike'),
    },
    {
        name: 'code',
        icon: (
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M5.80395 1.35631C5.80395 1.06647 5.69075 0.794129 5.48513 0.588497C5.08756 0.192017 4.34818 0.191471 3.95227 0.589044L0.31773 4.22415C0.115934 4.42594 0 4.70485 0 4.99087C0 5.27634 0.115937 5.5558 0.31773 5.75759L3.95339 9.39326C4.15792 9.59723 4.43026 9.70989 4.71957 9.70989C5.00777 9.70989 5.27957 9.59724 5.48575 9.39216C5.69082 9.18764 5.80402 8.91473 5.80402 8.62544C5.80402 8.33614 5.69082 8.06325 5.48575 7.85871L2.61855 4.99095L5.48533 2.12375C5.69096 1.91923 5.80415 1.64688 5.80415 1.35648L5.80395 1.35631Z"
                    fill="currentColor"
                />
                <path
                    d="M13.6821 4.22397L10.047 0.588315C9.64939 0.19129 8.91274 0.190183 8.51298 0.589409C8.30846 0.793935 8.1958 1.06684 8.1958 1.35559C8.1958 1.64597 8.309 1.91832 8.51298 2.12231L11.3813 4.99063L8.51298 7.85895C8.30846 8.06347 8.1958 8.33638 8.1958 8.62513C8.1958 8.91388 8.30846 9.18676 8.51408 9.39294C8.71915 9.59692 8.99205 9.70958 9.28025 9.70958C9.56846 9.70958 9.8408 9.59692 10.0464 9.3924L13.6815 5.7573C13.8833 5.5555 13.9993 5.27605 13.9993 4.99057C13.9993 4.70455 13.8839 4.42565 13.6821 4.22385L13.6821 4.22397Z"
                    fill="currentColor"
                />
            </svg>
        ),
        tooltipContent: 'Code',
        action: (editor: Editor) => editor.chain().focus().toggleCode().run(),
        isActive: (editor: Editor) => editor.isActive('code'),
    },
    {
        name: 'h1',
        icon: <Heading1 className="w-4 h-4" />,
        tooltipContent: 'Heading 1',
        action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: (editor: Editor) => editor.isActive('heading', { level: 1 }),
    },
    {
        name: 'h2',
        icon: <Heading2 className="w-4 h-4" />,
        tooltipContent: 'Heading 2',
        action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: (editor: Editor) => editor.isActive('heading', { level: 2 }),
    },
    {
        name: 'bulletList',
        icon: <List className="w-4 h-4" />,
        tooltipContent: 'Bullet List',
        action: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
        isActive: (editor: Editor) => editor.isActive('bulletList'),
    },
    {
        name: 'orderedList',
        icon: <ListOrdered className="w-4 h-4" />,
        tooltipContent: 'Ordered List',
        action: (editor: Editor) => editor.chain().focus().toggleOrderedList().run(),
        isActive: (editor: Editor) => editor.isActive('orderedList'),
    },
    {
        name: 'blockquote',
        icon: <Quote className="w-4 h-4" />,
        tooltipContent: 'Blockquote',
        action: (editor: Editor) => editor.chain().focus().toggleBlockquote().run(),
        isActive: (editor: Editor) => editor.isActive('blockquote'),
    },
    {
        name: 'horizontalRule',
        icon: <Minus className="w-4 h-4" />,
        tooltipContent: 'Horizontal Rule',
        action: (editor: Editor) => editor.chain().focus().setHorizontalRule().run(),
        isActive: () => false,
    },
    {
        name: 'link',
        icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_3781_82365)">
                    <path
                        d="M12.9069 1.09374C11.449 -0.364215 9.08481 -0.364215 7.62741 1.09374L5.54435 3.17624C5.70951 3.1582 5.87576 3.15054 6.0431 3.15054C6.57028 3.15054 7.08271 3.23421 7.5684 3.39554L8.74856 2.21538C9.15379 1.80961 9.69301 1.58648 10.2667 1.58648C10.8398 1.58648 11.3791 1.80961 11.7849 2.21538C12.1901 2.62061 12.4132 3.15875 12.4132 3.73298C12.4132 4.30612 12.1901 4.84533 11.7849 5.25058L9.47544 7.56002C9.06966 7.9658 8.53044 8.18893 7.95728 8.18893C7.38305 8.18893 6.84494 7.9658 6.43912 7.56002C6.24169 7.3637 6.08803 7.13455 5.98193 6.88518C5.71889 6.89995 5.4728 7.00932 5.28466 7.19691L4.66943 7.81268C4.83787 8.12441 5.05389 8.41862 5.31693 8.68275C6.77489 10.1407 9.13907 10.1407 10.597 8.68275L12.907 6.37219C14.3644 4.91479 14.3644 2.55117 12.907 1.09377L12.9069 1.09374Z"
                        fill="currentColor"
                    />
                    <path
                        d="M7.98178 10.8489C7.4535 10.8489 6.93614 10.7636 6.43954 10.5951L5.25117 11.7835C4.84594 12.1893 4.30727 12.4124 3.73357 12.4124C3.16044 12.4124 2.62178 12.1893 2.21597 11.7835C1.8102 11.3783 1.58707 10.8396 1.58707 10.2659C1.58707 9.69275 1.8102 9.15354 2.21597 8.74772L4.52541 6.43828C4.93119 6.03305 5.46932 5.81047 6.04301 5.81047C6.61724 5.81047 7.15536 6.0336 7.56117 6.43828C7.7586 6.63571 7.91281 6.86485 8.01945 7.11421C8.28359 7.10054 8.53023 6.99007 8.71781 6.80249L9.33195 6.18726C9.16351 5.87445 8.94695 5.58078 8.68336 5.31663C7.2254 3.85867 4.86122 3.85867 3.40382 5.31663L1.09438 7.62719C-0.364142 9.08515 -0.364142 11.4482 1.09438 12.9067C2.55234 14.3647 4.9154 14.3647 6.37336 12.9067L8.45306 10.827C8.29774 10.8412 8.14133 10.8495 7.98329 10.8495L7.98178 10.8489Z"
                        fill="currentColor"
                    />
                </g>
                <defs>
                    <clipPath id="clip0_3781_82365">
                        <rect width="14" height="14" fill="white" />
                    </clipPath>
                </defs>
            </svg>
        ),
        tooltipContent: 'Link',
        action: (editor: Editor) => {
            const url = window.prompt('URL')
            if (url) editor.chain().focus().setLink({ href: url }).run()
        },
        isActive: (editor: Editor) => editor.isActive('link'),
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
    maxLength = 2000,
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
                    class: 'rounded-md max-w-full h-auto my-4 border border-primary/20',
                },
            }),
            CharacterCount.configure({
                limit: maxLength,
            }),
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
                class: `focus:outline-none overflow-y-auto p-3 prose prose-sm dark:prose-invert max-w-none text-black dark:text-white [&_p]:text-black [&_p]:dark:text-white focus:[&_p]:!text-black focus:[&_p]:dark:!text-white [&_a]:font-semibold break-words [overflow-wrap:anywhere] ${expandHeight ? 'flex-1 h-full min-h-0' : 'min-h-[80px] md:min-h-[120px] max-h-[250px] md:max-h-[350px]'} ${className}`,
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

    const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
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

            {/* Toolbar - iOS 26 Style */}
            <div
                className={`not-prose flex items-center justify-between p-1 md:p-2 ${boxed ? `border-b ${borderClass}/50` : `border-b ${borderClass}/30`} bg-white/40 dark:bg-black/40 overflow-hidden`}
            >
                <ul className="flex items-center list-none p-0 m-0 space-x-1 w-full flex-nowrap overflow-x-auto no-scrollbar pb-1 -mb-1">
                    {buttons.map((button, index) => (
                        <li key={index} className="shrink-0">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                className={`p-1 md:p-1.5 rounded-full flex items-center justify-center transition-colors duration-300 ${button.isActive(editor) ? 'bg-black/10 dark:bg-white/10 text-primary shadow-sm' : 'text-primary/40 hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'}`}
                                title={button.tooltipContent}
                                onClick={(e) => {
                                    e.preventDefault()
                                    button.action(editor)
                                }}
                            >
                                {React.cloneElement(button.icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4' })}
                            </motion.button>
                        </li>
                    ))}
                    <li className="shrink-0">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            className="p-1 md:p-1.5 rounded-full flex items-center justify-center text-primary/40 hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300"
                            title="Image"
                            onClick={(e) => {
                                e.preventDefault()
                                open()
                            }}
                        >
                            <IconImage className="w-4 h-4" />
                        </motion.button>
                    </li>
                </ul>
            </div>

            {/* Editor Area - iOS 26 Style */}
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

            {/* Bottom Bar - iOS 26 Style */}
            <div className="flex justify-between items-center p-2 md:p-3 border-t border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/40">
                <div className="flex gap-2 items-center">
                    {cta ? (typeof cta === 'function' ? cta() : cta) : <div />}
                </div>
                <aside className="flex items-center gap-3">
                    <span className="text-[10px] font-bold opacity-40 text-primary lowercase tracking-wider">
                        {editor.storage.characterCount.characters()} / {maxLength}
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
