"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import { useAuth } from 'context/AuthContext'
import ForumAvatar from './ForumAvatar'
import ForumRichText from './ForumRichText'
import Input from 'components/OSForm/input'

interface ForumQuestionFormProps {
    onSubmit?: (data: { subject: string; body: string; topicId?: number }) => void
    className?: string
    isInForum?: boolean
    archived?: boolean
}

export default function ForumQuestionForm({ isInForum = false, archived = false, onSubmit, className = '' }: ForumQuestionFormProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const { profile } = useAuth()

    const handleSubmit = () => {
        if (body.trim() && (isInForum ? subject.trim() : true)) {
            onSubmit?.({ subject, body })
            setSubject('')
            setBody('')
            setIsOpen(false)
        }
    }

    if (!isOpen) {
        return (
            <div className={`flex flex-1 items-center space-x-3 ${className}`}>
                <div className="w-[40px] h-[40px] rounded-full overflow-hidden shrink-0">
                    <ForumAvatar
                        className="w-full h-full"
                        image={profile?.avatar_url}
                    />
                </div>
                <OSButton
                    onClick={() => setIsOpen(true)}
                    disabled={archived}
                    size="md"
                    width="full"
                    align="left"
                    variant="underlineOnHover"
                    className="border border-primary bg-accent/20 !p-3 text-primary/60 font-medium"
                >
                    {isInForum ? 'Ask a question' : 'Add a comment...'}
                </OSButton>
            </div>
        )
    }

    return (
        <div className={`relative ${className}`}>
            <div className="w-[40px] h-[40px] float-left rounded-full overflow-hidden">
                <ForumAvatar
                    className="w-full h-full"
                    image={profile?.avatar_url}
                />
            </div>
            <div className="pl-[55px] space-y-4">
                {isInForum && (
                    <Input
                        label="Subject"
                        showLabel={false}
                        value={subject}
                        onChange={(e: any) => setSubject(e.target.value)}
                        placeholder="Subject"
                        className="text-primary font-bold !text-[17px] border-none !p-0 focus:ring-0"
                        autoFocus
                    />
                )}

                <ForumRichText
                    initialValue={body}
                    setFieldValue={(field: string, value: string) => setBody(value)}
                    onSubmit={handleSubmit}
                    autoFocus={!isInForum}
                    boxed={false}
                    className="bg-transparent min-h-[120px]"
                    placeholder={isInForum ? "Type more details..." : "Add a comment..."}
                    cta={
                        <OSButton
                            size="sm"
                            variant="primary"
                            disabled={!body.trim() || (isInForum && !subject.trim())}
                            onClick={handleSubmit}
                        >
                            Post
                        </OSButton>
                    }
                />

                <p className="text-[11px] opacity-40 mt-4 [text-wrap:balance] text-primary">
                    If you need to share personal info relating to a bug or issue with your account, we suggest filing a support ticket in the app.
                </p>
            </div>
            <div className="clear-both" />
        </div>
    )
}
