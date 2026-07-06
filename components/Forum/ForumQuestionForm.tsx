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
    const [isOpen, setIsOpen] = useState(false)
    const { profile } = useAuth()

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
                    <div className="w-[28px] h-[28px] md:w-[30px] md:h-[30px] ml-[-2px] rounded-full overflow-hidden shrink-0 border !border-black/10 dark:!border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <ForumAvatar
                            className="w-full h-full"
                            image={profile?.avatar_url}
                        />
                    </div>
                    <button
                        onClick={() => setIsOpen(true)}
                        disabled={archived}
                        className="flex-1 min-w-0 text-left px-3 py-2 md:px-4 md:py-2.5 rounded-full border border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/60 supports-[backdrop-filter]:backdrop-blur-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:bg-white/80 dark:hover:bg-black/80 hover:scale-[1.01] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
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
                    className={`relative bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-[40px] rounded-[24px] md:rounded-[32px] p-3 md:p-4 border border-black/5 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden w-full max-w-full min-w-0 ${className} ${archived ? 'opacity-25 pointer-events-none' : ''}`}
                >
                    <div className="flex items-start gap-2 md:gap-3 mb-3">
                        <div className="w-[32px] h-[32px] md:w-[36px] md:h-[36px] rounded-full overflow-hidden shrink-0 mt-0.5 border border-black/10 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <ForumAvatar
                                className="w-full h-full"
                                image={profile?.avatar_url}
                            />
                        </div>

                        <div className="flex-1 min-w-0 w-full max-w-full">
                            {isInForum && (
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="subject (optional)"
                                    className="w-full bg-white/60 dark:bg-black/60 border border-black/5 dark:border-white/5 rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-primary font-bold outline-none placeholder:text-primary/40 focus:bg-white focus:border-black/10 dark:focus:bg-black/80 dark:focus:border-white/10 shadow-inner transition-all duration-300 lowercase"
                                    id="subject"
                                    name="subject"
                                    maxLength={140}
                                    autoFocus
                                />
                            )}
                        </div>
                    </div>

                    <div data-scheme="primary" className="space-y-2 md:space-y-3">
                        <ForumRichText
                            initialValue={body}
                            setFieldValue={(field: string, value: string) => setBody(value)}
                            onSubmit={handleSubmit}
                            mentions={true}
                            boxed={true}
                            borderClass="border-black/10 dark:border-white/10"
                            className="bg-transparent lowercase px-1 md:px-2"
                            placeholder={isInForum ? "type more details..." : "add a comment..."}
                            cta={
                                <div className="flex gap-2">
                                    <OSButton
                                        size="sm"
                                        variant="primary"
                                        disabled={!stripHtmlTags(body) || (isInForum && !subject.trim())}
                                        onClick={handleSubmit}
                                    >
                                        <span className="lowercase font-bold">post</span>
                                    </OSButton>
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
                                </div>
                            }
                        />

                        <p className="text-[10px] opacity-40 mt-2 px-2 [text-wrap:balance] text-primary lowercase font-medium tracking-wide">
                            if you need to share personal info relating to a bug or issue with your account, we suggest filing a support ticket in the app.
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
