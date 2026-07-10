"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import { useAuth } from 'context/AuthContext'
import ForumAvatar from './ForumAvatar'
import ForumRichText from './ForumRichText'
import { stripHtmlTags } from 'utils/security'
import { AnimatePresence, motion } from 'framer-motion'

interface ForumQuestionFormProps {
    onSubmit?: (data: { subject: string; body: string; topicId?: number }) => void
    className?: string
    isInForum?: boolean
    archived?: boolean
}

export default function ForumQuestionForm({ isInForum = false, archived = false, onSubmit, className = '' }: ForumQuestionFormProps) {
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const { profile } = useAuth()
    const [isOpen, setIsOpen] = useState(false)

    const handleSubmit = () => {
        if (stripHtmlTags(body) && (isInForum ? subject.trim() : true)) {
            onSubmit?.({ subject, body })
            setSubject('')
            setBody('')
            setIsOpen(false)
        }
    }

    return (
        <AnimatePresence mode="wait">
            {!isOpen ? (
                <motion.div
                    key="inactive"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`p-1 flex items-center space-x-2 md:space-x-3 w-full max-w-full min-w-0 ${className} ${archived ? 'opacity-25 pointer-events-none' : ''}`}
                >
                    <div className="w-[32px] h-[32px] md:w-[36px] md:h-[36px] ml-[-2px] rounded-full overflow-hidden shrink-0 border border-black/5 dark:border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <ForumAvatar
                            className="w-full h-full"
                            image={profile?.avatar_url}
                        />
                    </div>
                    <button
                        onClick={() => setIsOpen(true)}
                        disabled={archived}
                        className="flex-1 min-w-0 text-left px-4 py-2 md:px-5 md:py-2.5 rounded-full border border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/60 supports-[backdrop-filter]:backdrop-blur-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:bg-white/80 dark:hover:bg-black/80 hover:scale-[1.01] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    >
                        <span className="font-bold text-xs md:text-sm text-primary/60 lowercase block truncate">{isInForum ? "start a new discussion..." : "add a comment..."}</span>
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    key="active"
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className={`relative bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-[40px] rounded-[32px] p-4 md:p-6 border border-black/5 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden w-full max-w-full min-w-0 flex flex-col gap-4 ${className} ${archived ? 'opacity-25 pointer-events-none' : ''}`}
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <div className="w-[32px] h-[32px] rounded-full overflow-hidden shrink-0 border border-black/5 dark:border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                <ForumAvatar
                                    className="w-full h-full"
                                    image={profile?.avatar_url}
                                />
                            </div>
                            <span className="text-sm font-bold text-primary/60 lowercase">{profile?.username || 'user'}</span>
                        </div>
                        <div className="flex gap-2">
                            <OSButton
                                size="sm"
                                variant="default"
                                onClick={() => {
                                    setBody('')
                                    setSubject('')
                                    setIsOpen(false)
                                }}
                                className="border-none opacity-60 hover:opacity-100"
                            >
                                <span className="lowercase font-bold">cancel</span>
                            </OSButton>
                            <OSButton
                                size="sm"
                                variant="primary"
                                disabled={!stripHtmlTags(body) || (isInForum && !subject.trim())}
                                onClick={handleSubmit}
                            >
                                <span className="lowercase font-bold">post</span>
                            </OSButton>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-w-0 w-full max-w-full gap-2">
                        {isInForum && (
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Document Title"
                                className="w-full bg-transparent px-2 md:px-3 py-2 text-xl md:text-2xl text-primary font-black outline-none placeholder:text-primary/20 transition-all duration-200 lowercase"
                                id="subject"
                                name="subject"
                                maxLength={140}
                                autoFocus
                            />
                        )}
                        <div data-scheme="primary" className="flex-1 w-full relative">
                            <ForumRichText
                                initialValue={body}
                                setFieldValue={(field: string, value: string) => setBody(value)}
                                onSubmit={handleSubmit}
                                mentions={true}
                                boxed={false}
                                wrapperClassName="!bg-transparent !border-none !shadow-none !rounded-none"
                                className="!bg-transparent !p-2 md:!p-3 !text-base md:!text-lg"
                                placeholder={isInForum ? "Start writing your note here..." : "Write a comment..."}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
