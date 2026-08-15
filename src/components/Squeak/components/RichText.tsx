import React, { useEffect, useRef, useState, useCallback, useContext, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import Spinner from 'components/Spinner'
import slugify from 'slugify'
import { isURL } from 'lib/utils'
import { CurrentQuestionContext } from './Question'
import Avatar from './Avatar'
import { AnimatePresence, motion } from 'framer-motion'
import { IconImage, IconX } from '@posthog/icons'
import OSButton from 'components/OSButton'
import {
    mentionChipHtml,
    searchMentionCandidates,
    type MentionCandidate,
} from 'lib/forum-mentions'

const buttons = [
    {
        command: 'bold' as const,
        icon: (
            <svg width="11" height="13" viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M0.394742 13H5.65074C8.31474 13 10.1867 11.632 10.1867 9.238C10.1867 7.6 9.21474 6.574 8.08074 6.124C8.80074 5.728 9.53874 4.828 9.53874 3.64C9.53874 1.534 7.79274 0.399999 5.52474 0.399999H0.394742V13ZM3.23874 10.552V7.546H5.41674C6.87474 7.546 7.50474 8.086 7.50474 9.076C7.50474 10.048 6.87474 10.552 5.41674 10.552H3.23874ZM3.23874 5.17V2.632H5.23674C6.42474 2.632 6.92874 3.118 6.92874 3.91C6.92874 4.684 6.42474 5.17 5.29074 5.17H3.23874Z"
                    fill="currentColor"
                />
            </svg>
        ),
        tooltipContent: 'Bold',
    },
    {
        command: 'italic' as const,
        icon: (
            <svg width="4" height="13" viewBox="0 0 4 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M0.0360938 13H1.56609L3.00609 3.928H1.47609L0.0360938 13ZM1.63809 2.2H3.40209L3.70809 0.256H1.94409L1.63809 2.2Z"
                    fill="currentColor"
                />
            </svg>
        ),
        tooltipContent: 'Italic',
    },
    {
        command: 'code' as const,
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
    },
    {
        command: 'link' as const,
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
    },
]

function threadMentionCandidates(question: any): MentionCandidate[] {
    const out: MentionCandidate[] = []
    const push = (profile: any) => {
        if (!profile) return
        const attrs = profile.attributes || profile
        const username = String(attrs.username || attrs.firstName || '').trim()
        if (!username) return
        out.push({
            id: String(profile.id || attrs.id || username),
            username,
            avatar_url: attrs.avatar?.data?.attributes?.url || attrs.gravatarURL || attrs.avatar_url || null,
            is_bot: !!attrs.is_bot,
        })
    }
    push(question?.profile?.data || question?.profile)
    const replies = question?.replies?.data || []
    for (const reply of replies) {
        push(reply?.attributes?.profile?.data || reply?.profile?.data)
    }
    return out
}

const MentionMenu = ({
    people,
    focused,
    onSelect,
    onClose,
}: {
    people: MentionCandidate[]
    focused: number
    onSelect: (person: MentionCandidate) => void
    onClose: () => void
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.12 } }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute left-2 right-2 bottom-full z-50 mb-1"
        >
            <div className="border border-navy/30 bg-primary rounded-md shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-2 py-1 border-b border-primary">
                    <span className="text-[11px] font-semibold text-navy">Mention</span>
                    <OSButton type="button" variant="default" size="xs" icon={<IconX className="w-3" />} className="!p-1" onClick={onClose} />
                </div>
                <ul className="m-0 p-0 list-none max-h-52 overflow-auto">
                    {people.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-secondary">No one matches</li>
                    ) : (
                        people.map((person, index) => (
                            <li key={person.id} className="border-b border-primary last:border-0">
                                <OSButton
                                    type="button"
                                    variant="default"
                                    width="full"
                                    align="left"
                                    className={`!px-3 !py-1.5 !justify-start ${focused === index ? 'bg-navy/10' : ''}`}
                                    active={focused === index}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        onSelect(person)
                                    }}
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="size-6 overflow-hidden rounded-full shrink-0">
                                            <Avatar className="w-full" image={person.avatar_url || ''} />
                                        </div>
                                        <span className="inline-flex items-center px-1.5 py-px rounded-sm border border-navy text-navy bg-navy/10 text-xs font-semibold">
                                            @{person.username}
                                        </span>
                                    </div>
                                </OSButton>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </motion.div>
    )
}

function mentionQueryBeforeCaret(): string | null {
    const sel = typeof window === 'undefined' ? null : window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const range = sel.getRangeAt(0)
    if (!range.collapsed) return null
    const node = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) return null
    const text = node.textContent || ''
    const head = text.slice(0, range.startOffset)
    const match = head.match(/(^|[\s(])@([A-Za-z0-9._-]*)$/)
    return match ? match[2] : null
}

function replaceActiveMentionQuery(html: string) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return false
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) return false
    const text = node.textContent || ''
    const head = text.slice(0, range.startOffset)
    const match = head.match(/(^|[\s(])@([A-Za-z0-9._-]*)$/)
    if (!match || match.index == null) return false
    const start = match.index + match[1].length
    const wipe = document.createRange()
    wipe.setStart(node, start)
    wipe.setEnd(node, range.startOffset)
    sel.removeAllRanges()
    sel.addRange(wipe)
    document.execCommand('insertHTML', false, `${html}&nbsp;`)
    return true
}

function emptyHtmlToValue(html: string) {
    const text = html
        .replace(/<br\s*\/?>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
    return text ? html : ''
}

function selectedText() {
    return typeof window === 'undefined' ? '' : window.getSelection()?.toString() || ''
}

export default function RichText({
    initialValue = '',
    setFieldValue,
    autoFocus,
    values,
    onSubmit,
    maxLength = 2000,
    label = '',
    mentions = false,
    bodyKey = 'body',
    className = '',
    cta = React.ReactNode,
}: any) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [value, setValue] = useState(initialValue)
    const [plainLength, setPlainLength] = useState(0)
    const [imageLoading, setImageLoading] = useState(false)
    const [showMentionProfiles, setShowMentionProfiles] = useState(false)
    const [mentionQuery, setMentionQuery] = useState('')
    const [mentionFocus, setMentionFocus] = useState(0)
    const [mentionPeople, setMentionPeople] = useState<MentionCandidate[]>([])
    const mentionProfilesRef = useRef<HTMLDivElement>(null)
    const currentQuestion = useContext(CurrentQuestionContext)
    const inThread = useMemo(
        () => threadMentionCandidates(currentQuestion?.question),
        [currentQuestion?.question]
    )

    const syncFromEditor = useCallback(() => {
        const el = editorRef.current
        if (!el) return
        const html = emptyHtmlToValue(el.innerHTML)
        const length = (el.innerText || '').replace(/\u200b/g, '').trimEnd().length
        setValue(html)
        setPlainLength(length)
        setFieldValue(bodyKey, html)
    }, [bodyKey, setFieldValue])

    const focusEditor = () => editorRef.current?.focus()

    const applyFormat = (command: 'bold' | 'italic' | 'code' | 'link') => {
        focusEditor()
        if (command === 'bold' || command === 'italic') {
            document.execCommand(command, false)
        } else if (command === 'code') {
            const text = selectedText() || 'code'
            document.execCommand('insertHTML', false, `<code>${text}</code>&nbsp;`)
        } else if (command === 'link') {
            const url = window.prompt('Link URL')
            if (url) document.execCommand('createLink', false, url)
        }
        syncFromEditor()
    }

    const onDrop = useCallback(
        async (acceptedFiles) => {
            const file = acceptedFiles[0]
            if (!file) return
            const fakeImagePath = `/${Date.now()}/${slugify(file.name)}`
            const objectURL = URL.createObjectURL(file)
            setFieldValue('images', [
                ...(values.images || []),
                { fakeImagePath, file, objectURL },
            ])
            focusEditor()
            document.execCommand('insertHTML', false, `<img src="${objectURL}" alt="${file.name}" />`)
            syncFromEditor()
        },
        [setFieldValue, syncFromEditor, values.images]
    )

    const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true,
        multiple: false,
        accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/gif': ['.gif'] },
    })

    const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
        const images = Array.from(e.clipboardData.items).filter((item) =>
            ['image/jpeg', 'image/png'].includes(item.type)
        )
        if (images.length > 0) {
            e.preventDefault()
            const image = images[0].getAsFile()
            if (image) await onDrop([image])
            return
        }
        const text = e.clipboardData.getData('text/plain')
        if (text && isURL(text) && selectedText()) {
            e.preventDefault()
            document.execCommand('createLink', false, text)
            syncFromEditor()
        }
    }

    useEffect(() => {
        const el = editorRef.current
        if (!el) return
        if (autoFocus) el.focus()
        if (!initialValue || el.innerHTML) return
        el.innerHTML = /^\s*</.test(initialValue)
            ? initialValue
            : initialValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')
        syncFromEditor()
    }, [autoFocus, initialValue, syncFromEditor])

    const refreshMentionQuery = () => {
        if (!mentions) return
        const query = mentionQueryBeforeCaret()
        if (query == null) {
            setShowMentionProfiles(false)
            setMentionQuery('')
            return
        }
        setMentionQuery(query)
        setShowMentionProfiles(true)
        setMentionFocus(0)
    }

    useEffect(() => {
        if (!showMentionProfiles) return
        let live = true
        searchMentionCandidates(mentionQuery, inThread).then((rows) => {
            if (live) setMentionPeople(rows)
        })
        return () => {
            live = false
        }
    }, [showMentionProfiles, mentionQuery, inThread])

    const handleProfileSelect = (person: MentionCandidate) => {
        focusEditor()
        if (!replaceActiveMentionQuery(mentionChipHtml(person.username))) {
            document.execCommand('insertHTML', false, `${mentionChipHtml(person.username)}&nbsp;`)
        }
        setShowMentionProfiles(false)
        setMentionQuery('')
        syncFromEditor()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (showMentionProfiles && mentionPeople.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setMentionFocus((prev) => (prev + 1) % mentionPeople.length)
                return
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setMentionFocus((prev) => (prev - 1 + mentionPeople.length) % mentionPeople.length)
                return
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault()
                handleProfileSelect(mentionPeople[mentionFocus] || mentionPeople[0])
                return
            }
            if (e.key === 'Escape') {
                e.preventDefault()
                setShowMentionProfiles(false)
                return
            }
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
            e.preventDefault()
            onSubmit()
        }
        if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            applyFormat('bold')
        }
        if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            applyFormat('italic')
        }
        if (e.key === '@') {
            setShowMentionProfiles(true)
            setMentionQuery('')
            setMentionFocus(0)
        }
    }

    const handleContainerClick = (e) => {
        if (!mentionProfilesRef.current?.contains(e.target)) {
            setShowMentionProfiles(false)
        }
    }

    return (
        <div className="relative" {...getRootProps()}>
            <div onClick={handleContainerClick}>
                <input className="hidden" {...getInputProps()} />
                <div
                    data-scheme="secondary"
                    className="not-prose bg-primary flex items-center justify-between py-0.5 border border-primary rounded-t"
                >
                    <ul className="flex items-center list-none p-0 mx-2 space-x-1 w-full !mb-0">
                        {buttons.map((button, index) => {
                            return (
                                <li key={index}>
                                    <OSButton
                                        type="button"
                                        variant="default"
                                        size="md"
                                        icon={button.icon}
                                        iconClassName="size-5 justify-center items-center flex"
                                        className="!text-secondary hover:!text-primary"
                                        tooltip={!imageLoading ? button.tooltipContent : undefined}
                                        tooltipDelay={500}
                                        disabled={imageLoading}
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            applyFormat(button.command)
                                        }}
                                    />
                                </li>
                            )
                        })}
                        <li>
                            <OSButton
                                type="button"
                                variant="default"
                                size="md"
                                disabled={imageLoading}
                                icon={<IconImage />}
                                iconClassName="size-5 justify-center items-center flex"
                                className="!text-secondary hover:!text-primary"
                                tooltip={!imageLoading ? 'Image' : undefined}
                                tooltipDelay={500}
                                onClick={(e) => {
                                    e.preventDefault()
                                    open()
                                }}
                            />
                        </li>
                    </ul>
                </div>
                    <div className="relative border border-primary border-t-0 rounded-b">
                        {mentions && (
                            <AnimatePresence>
                                {showMentionProfiles && (
                                    <div ref={mentionProfilesRef} onClick={(e) => e.stopPropagation()}>
                                        <MentionMenu
                                            people={mentionPeople}
                                            focused={mentionFocus}
                                            onClose={() => {
                                                setShowMentionProfiles(false)
                                                focusEditor()
                                            }}
                                            onSelect={handleProfileSelect}
                                        />
                                    </div>
                                )}
                            </AnimatePresence>
                        )}
                        {label && !!value && (
                            <label className="text-sm opacity-60 block font-medium mb-1">{label}</label>
                        )}
                        <div
                            id="body"
                            ref={editorRef}
                            contentEditable={!imageLoading}
                            role="textbox"
                            aria-multiline="true"
                            data-placeholder="Type more details..."
                            suppressContentEditableWarning
                            className={`w-full min-h-40 max-h-[500px] overflow-auto px-3 py-2 outline-none break-words [overflow-wrap:anywhere] empty:before:content-[attr(data-placeholder)] empty:before:opacity-50 empty:before:pointer-events-none [&_strong]:font-bold [&_em]:italic [&_code]:px-1 [&_code]:rounded-sm [&_code]:bg-accent [&_a]:underline [&_img]:max-w-full [&_.forum-mention]:inline-flex [&_.forum-mention]:items-center [&_.forum-mention]:px-1.5 [&_.forum-mention]:py-px [&_.forum-mention]:rounded-sm [&_.forum-mention]:border [&_.forum-mention]:border-navy [&_.forum-mention]:text-navy [&_.forum-mention]:bg-navy/10 [&_.forum-mention]:font-semibold ${className}`}
                            onInput={() => {
                                syncFromEditor()
                                refreshMentionQuery()
                            }}
                            onPaste={handlePaste}
                            onKeyDown={handleKeyDown}
                        />

                        {isDragActive && (
                            <div className="bg-white dark:bg-accent-dark z-10 rounded-md flex items-center justify-center absolute w-full h-full inset-0 p-2 after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-[calc(100%-2rem)] after:h-[calc(100%-2rem)] after:border after:border-dashed after:border-primary after:dark: after:rounded-md">
                                <p className="m-0 font-semibold">Drop image here</p>
                            </div>
                        )}
                    </div>

                {imageLoading && (
                    <div className="w-full h-full inset-0 bg-white/50 dark:bg-black/50 absolute flex justify-center items-center">
                        <Spinner className="w-10 h-10" />
                    </div>
                )}

                <div className="flex justify-between items-center mt-2">
                    <div className="flex gap-2 items-center">{typeof cta === 'function' ? cta() : cta}</div>
                    <aside className="flex items-center gap-2">
                        <span className="text-xs opacity-70 text-primary">
                            {plainLength} / {maxLength}
                        </span>
                    </aside>
                </div>
            </div>
        </div>
    )
}
