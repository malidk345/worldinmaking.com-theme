"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import { useAuth } from 'context/AuthContext'
import ForumAvatar from './ForumAvatar'
import ForumRichText from './ForumRichText'
import Input from 'components/OSForm/input'
import { stripHtmlTags } from 'utils/security'
import { motion } from 'framer-motion'

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

    const handleSubmit = () => {
        if (stripHtmlTags(body) && (isInForum ? subject.trim() : true)) {
            onSubmit?.({ subject, body })
            setSubject('')
            setBody('')
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-[40px] rounded-[24px] md:rounded-[32px] p-3 md:p-4 border border-black/5 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] w-full max-w-full min-w-0 ${className} ${archived ? 'opacity-25 pointer-events-none' : ''}`}
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
                        <div className="mb-2 md:mb-3">
                            <Input
                                label="Subject"
                                showLabel={false}
                                value={subject}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                                placeholder="subject (optional)"
                                className="!w-full bg-white/60 dark:bg-black/60 !border !border-black/5 dark:!border-white/5 !rounded-full !px-3 !py-1.5 md:!px-4 md:!py-2 text-xs md:text-sm text-primary font-bold outline-none placeholder:text-primary/40 focus:!bg-white focus:!border-black/10 dark:focus:!bg-black/80 dark:focus:!border-white/10 shadow-inner transition-all duration-300 lowercase"
                                onBlur={(e: React.FocusEvent<HTMLInputElement>) => e.preventDefault()}
                                required
                                id="subject"
                                name="subject"
                                maxLength={140}
                                autoFocus
                            />
                        </div>
                    )}

                    <div data-scheme="primary" className="space-y-2 md:space-y-3">
                        <ForumRichText
                            initialValue={body}
                            setFieldValue={(field: string, value: string) => setBody(value)}
                            onSubmit={handleSubmit}
                            autoFocus={!isInForum}
                            boxed={true}
                            borderClass="border-black/10 dark:border-white/10"
                            className="bg-transparent lowercase px-1 md:px-2"
                            placeholder={isInForum ? "type more details..." : "add a comment..."}
                            cta={
                                <OSButton
                                    size="sm"
                                    variant="primary"
                                    disabled={!stripHtmlTags(body) || (isInForum && !subject.trim())}
                                    onClick={handleSubmit}
                                    className="rounded-full !px-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-105 active:scale-95 transition-all duration-300"
                                >
                                    <span className="lowercase font-bold">post</span>
                                </OSButton>
                            }
                        />

                        <p className="text-[10px] opacity-40 mt-2 px-2 [text-wrap:balance] text-primary lowercase font-medium tracking-wide">
                            if you need to share personal info relating to a bug or issue with your account, we suggest filing a support ticket in the app.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
