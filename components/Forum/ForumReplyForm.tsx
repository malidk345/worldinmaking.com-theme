"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import ForumRichText from './ForumRichText'
import ForumAvatar from './ForumAvatar'
import { useAuth } from 'context/AuthContext'
import { stripHtmlTags } from 'utils/security'
import { AnimatePresence, motion } from 'framer-motion'

interface ForumReplyFormProps {
    isInForum?: boolean
    archived?: boolean
    initialValue?: string
    onSubmit?: (content: string) => void
}

export default function ForumReplyForm({ archived = false, isInForum = false, initialValue = '', onSubmit }: ForumReplyFormProps) {
    const [body, setBody] = useState(initialValue)
    const [isOpen, setIsOpen] = useState(false)
    const { profile } = useAuth()

    const handleSubmit = () => {
        if (stripHtmlTags(body)) {
            onSubmit?.(body)
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
                    className={`p-1 flex items-center space-x-2 md:space-x-3 w-full max-w-full min-w-0 ${archived ? 'opacity-25 pointer-events-none' : ''}`}
                >
                    {!isInForum && (
                        <div className="w-[28px] h-[28px] md:w-[30px] md:h-[30px] ml-[-2px] rounded-full overflow-hidden shrink-0 border !border-black/10 dark:!border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <ForumAvatar
                                className="w-full h-full"
                                image={profile?.avatar_url}
                            />
                        </div>
                    )}
                    <button
                        onClick={() => setIsOpen(true)}
                        disabled={archived}
                        className="flex-1 min-w-0 text-left px-3 py-2 md:px-4 md:py-2.5 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                    >
                        <span className="font-bold text-xs md:text-sm text-primary/60 lowercase block truncate">reply...</span>
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    key="active"
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className={`relative bg-white dark:bg-[#1C1C1E] rounded-[24px] md:rounded-[32px] p-3 md:p-4 border border-black/5 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden w-full max-w-full min-w-0 ${archived ? 'opacity-25 pointer-events-none' : ''}`}
                >
                    <div className="flex items-start gap-2 md:gap-3">
                        {!isInForum && (
                            <div className="w-[32px] h-[32px] md:w-[36px] md:h-[36px] rounded-full overflow-hidden shrink-0 mt-0.5 border border-black/10 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                <ForumAvatar
                                    className="w-full h-full"
                                    image={profile?.avatar_url}
                                />
                            </div>
                        )}
                        <div className="flex-1 min-w-0 w-full max-w-full">
                            <ForumRichText
                                initialValue={body}
                                setFieldValue={(field: string, value: string) => setBody(value)}
                                onSubmit={handleSubmit}
                                autoFocus
                                boxed={true}
                                borderClass="border-black/10 dark:border-white/10"
                                className="bg-transparent lowercase px-1 md:px-2"
                                placeholder="type your reply..."
                                cta={
                                    <div className="flex gap-2">
                                        <OSButton
                                            size="sm"
                                            variant="primary"
                                            disabled={!stripHtmlTags(body)}
                                            onClick={handleSubmit}
                                        >
                                            <span className="lowercase font-bold">post</span>
                                        </OSButton>
                                        <OSButton
                                            size="sm"
                                            variant="default"
                                            onClick={() => setIsOpen(false)}
                                            className="border-none opacity-60 hover:opacity-100"
                                        >
                                            <span className="lowercase font-bold">cancel</span>
                                        </OSButton>
                                    </div>
                                }
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
