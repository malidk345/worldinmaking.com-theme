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
                        className="flex-1 min-w-0 text-left px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
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
                    className={`relative bg-white dark:bg-[#1C1C1E] rounded-[24px] p-2.5 md:p-3 border border-gray-100 dark:border-gray-800 shadow-md overflow-hidden w-full max-w-full min-w-0 ${className} ${archived ? 'opacity-25 pointer-events-none' : ''}`}
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
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5 text-xs md:text-sm text-primary font-bold outline-none placeholder:text-primary/40 focus:bg-white dark:focus:bg-black focus:border-gray-300 dark:focus:border-gray-700 transition-all duration-200 lowercase"
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
