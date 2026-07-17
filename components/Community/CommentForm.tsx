"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
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
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                    className={`flex items-center space-x-2 md:space-x-3 w-full max-w-full min-w-0 ${className}`}
                >
                    <div className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] rounded-full overflow-hidden shrink-0 border-[0.5px] border-black/10 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <ForumAvatar
                            className="w-full h-full"
                            image={profile?.avatar_url}
                        />
                    </div>
                    <button
                        id="comment-form-button"
                        onClick={() => setIsActive(true)}
                        className="flex-1 min-w-0 text-left px-3 py-2 md:px-5 md:py-3 rounded-[20px] md:rounded-[24px] border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] active:scale-[0.97] transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    >
                        <span className="font-medium text-[13px] md:text-[15px] tracking-tight text-black/40 dark:text-white/40 lowercase truncate block">{activePlaceholder}</span>
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    key="active"
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
                    className={`relative bg-transparent rounded-[24px] md:rounded-[32px] w-full max-w-full min-w-0 ${className}`}
                >
                    <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
                        <div className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] rounded-full overflow-hidden shrink-0 border-[0.5px] border-black/10 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mt-0.5 md:mt-0">
                            <ForumAvatar
                                className="w-full h-full"
                                image={profile?.avatar_url}
                            />
                        </div>
                        <div className="flex-1 min-w-0 w-full max-w-full">
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={t('comments.subject_placeholder')}
                                className="w-full bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-[12px] md:rounded-[16px] px-3 py-2 md:px-4 md:py-3 text-[13px] md:text-[15px] tracking-tight text-black/90 dark:text-white/90 font-medium outline-none placeholder:text-black/30 dark:placeholder:text-white/30 focus:bg-black/[0.04] dark:focus:bg-white/[0.04] focus:border-black/10 dark:focus:border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] lowercase"
                                id="comment-subject"
                                name="subject"
                                maxLength={140}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div data-scheme="primary" className="space-y-2 md:space-y-3 w-full max-w-full min-w-0">
                        <ForumRichText
                            initialValue={body}
                            setFieldValue={(field: string, value: string) => setBody(value)}
                            onSubmit={handleSubmit}
                            mentions={true}
                            boxed={true}
                            borderClass="border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] rounded-[16px] md:rounded-[24px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] focus-within:bg-black/[0.04] dark:focus-within:bg-white/[0.04] focus-within:border-black/10 dark:focus-within:border-white/10"
                            className="bg-transparent lowercase text-[13px] md:text-[15px] tracking-tight text-black/80 dark:text-white/80"
                            placeholder={activePlaceholder}
                            cta={
                                <div className="flex gap-2">
                                    <OSButton
                                        size="sm"
                                        variant="primary"
                                        disabled={!stripHtmlTags(body)}
                                        onClick={handleSubmit}
                                        className="rounded-full font-semibold text-[12px] md:text-[13px] px-3 py-1 md:px-4 md:py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.1)] active:scale-[0.96] transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                    >
                                        <span className="lowercase">{t('comments.post_btn')}</span>
                                    </OSButton>
                                    <OSButton
                                        size="sm"
                                        variant="default"
                                        onClick={() => {
                                            setBody('')
                                            setSubject('')
                                            setIsActive(false)
                                        }}
                                        className="rounded-full font-medium text-[12px] md:text-[13px] px-3 py-1 md:px-4 md:py-1.5 border-black/5 dark:border-white/5 bg-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.96] transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                    >
                                        <span className="lowercase">{t('comments.cancel_btn')}</span>
                                    </OSButton>
                                </div>
                            }
                        />
                        <p className="text-[11px] md:text-[12px] text-black/40 dark:text-white/40 px-1 md:px-2 [text-wrap:balance] lowercase font-medium tracking-wide transition-colors duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]">
                            {t('comments.guidelines')}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
