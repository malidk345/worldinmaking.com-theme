"use client"

import React, { useState } from 'react'
import { LemonButton, LemonInput, LemonTextAreaMarkdown } from '@/components/LemonUI'
import { useAuth } from 'context/AuthContext'
import ForumAvatar from '../Forum/ForumAvatar'
import ForumRichText from '../Forum/ForumRichText'
import { stripHtmlTags } from 'utils/security'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'hooks/useTranslation'

interface CommentFormProps {
    onSubmit?: (subject: string, content: string) => void
    className?: string
    placeholder?: string
}

export default function CommentForm({ onSubmit, className = '', placeholder }: CommentFormProps) {
    const { t } = useTranslation()
    const activePlaceholder = placeholder || t('comments.add_placeholder')
    const [body, setBody] = useState('')
    const [subject, setSubject] = useState('')
    const [isActive, setIsActive] = useState(false)
    const { profile } = useAuth()

    const handleSubmit = () => {
        if (stripHtmlTags(body)) {
            onSubmit?.(subject, body)
            setBody('')
            setSubject('')
            setIsActive(false)
        }
    }

    return (
        <AnimatePresence mode="wait">
            {!isActive ? (
                <motion.div
                    key="inactive"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`p-1 flex items-center space-x-2 md:space-x-3 w-full max-w-full min-w-0 ${className}`}
                >
                    <div className="w-[28px] h-[28px] md:w-[30px] md:h-[30px] ml-[-2px] rounded-full overflow-hidden shrink-0 border !border-black/10 dark:!border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <ForumAvatar
                            className="w-full h-full"
                            image={profile?.avatar_url}
                        />
                    </div>
                    <button
                        id="comment-form-button"
                        onClick={() => setIsActive(true)}
                        className="flex-1 min-w-0 text-left px-3 py-2 md:px-4 md:py-2.5 rounded-full border border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/60 supports-[backdrop-filter]:backdrop-blur-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:bg-white/80 dark:hover:bg-black/80 hover:scale-[1.01] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    >
                        <span className="font-bold text-xs md:text-sm text-primary/60 lowercase truncate block">{activePlaceholder}</span>
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    key="active"
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className={`relative bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-[40px] rounded-[24px] md:rounded-[32px] p-3 md:p-4 border border-black/5 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden w-full max-w-full min-w-0 ${className}`}
                >
                    <div className="flex items-start gap-2 md:gap-3 mb-3">
                        <div className="w-[32px] h-[32px] md:w-[36px] md:h-[36px] rounded-full overflow-hidden shrink-0 mt-0.5 border border-black/10 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <ForumAvatar
                                className="w-full h-full"
                                image={profile?.avatar_url}
                            />
                        </div>
                        <div className="flex-1 min-w-0 w-full max-w-full">
                            <LemonInput
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={t('comments.subject_placeholder')}
                                id="comment-subject"
                                name="subject"
                                maxLength={140}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div data-scheme="primary" className="space-y-2 md:space-y-3">
                        <LemonTextAreaMarkdown
                            value={body}
                            onChange={(val) => setBody(val)}
                            placeholder={activePlaceholder}
                            onPressCmdEnter={handleSubmit}
                            minRows={4}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <LemonButton
                                size="small"
                                type="tertiary"
                                onClick={() => {
                                    setBody('')
                                    setSubject('')
                                    setIsActive(false)
                                }}
                            >
                                <span className="lowercase font-bold">{t('comments.cancel_btn')}</span>
                            </LemonButton>
                            <LemonButton
                                size="small"
                                type="primary"
                                disabled={!stripHtmlTags(body)}
                                onClick={handleSubmit}
                            >
                                <span className="lowercase font-bold">{t('comments.post_btn')}</span>
                            </LemonButton>
                        </div>
                        <p className="text-[10px] opacity-40 mt-2 px-2 [text-wrap:balance] text-primary lowercase font-medium tracking-wide">
                            {t('comments.guidelines')}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
