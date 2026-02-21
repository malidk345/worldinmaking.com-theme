"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import { useAuth } from 'context/AuthContext'
import ForumAvatar from './ForumAvatar'
import ForumRichText from './ForumRichText'
import Input from 'components/OSForm/input'
import { stripHtmlTags } from 'utils/security'

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
        <div className={`relative ${className} ${archived ? 'opacity-25 pointer-events-none' : ''}`}>
            <div className="w-[40px] h-[40px] float-left rounded-full overflow-hidden">
                <ForumAvatar
                    className="w-full h-full"
                    image={profile?.avatar_url}
                />
            </div>

            <div data-scheme="primary" className="pl-[55px] space-y-2">
                {isInForum && (
                    <>
                        <Input
                            label="Subject"
                            showLabel={false}
                            value={subject}
                            onChange={(e: any) => setSubject(e.target.value)}
                            placeholder="Subject"
                            className="text-primary"
                            onBlur={(e: any) => e.preventDefault()}
                            required
                            id="subject"
                            name="subject"
                            maxLength={140}
                            autoFocus
                        />
                    </>
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
                            disabled={!stripHtmlTags(body) || (isInForum && !subject.trim())}
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
