"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import { useAuth } from 'context/AuthContext'
import ForumAvatar from '../Forum/ForumAvatar'
import ForumRichText from '../Forum/ForumRichText'
import Input from '../OSForm/input'
import { stripHtmlTags } from 'utils/security'

interface CommentFormProps {
    onSubmit?: (subject: string, content: string) => void
    className?: string
    placeholder?: string
}

export default function CommentForm({ onSubmit, className = '', placeholder = "add a comment..." }: CommentFormProps) {
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

    if (!isActive) {
        return (
            <div className={`p-1 flex items-center space-x-3 ${className}`}>
                <div className="w-[30px] h-[30px] ml-[-2px] rounded-full overflow-hidden shrink-0 border border-border">
                    <ForumAvatar
                        className="w-full h-full"
                        image={profile?.avatar_url}
                    />
                </div>
                <OSButton
                    id="comment-form-button"
                    onClick={() => setIsActive(true)}
                    size="md"
                    width="full"
                    align="left"
                    variant="underlineOnHover"
                    className="border border-border bg-accent/70 hover:bg-accent !p-2"
                >
                    <span className="font-bold text-primary">{placeholder}</span>
                </OSButton>
            </div>
        )
    }

    return (
        <div className={`relative ${className}`}>
            <div className="w-[40px] h-[40px] float-left ml-[-2px] rounded-full overflow-hidden shrink-0 mt-1">
                <ForumAvatar
                    className="w-full h-full"
                    image={profile?.avatar_url}
                />
            </div>
            <div data-scheme="primary" className="pl-[55px] space-y-3">
                <Input
                    label="subject (optional)"
                    showLabel={false}
                    value={subject}
                    onChange={(e: any) => setSubject(e.target.value)}
                    placeholder="subject (optional)"
                    className="text-primary lowercase !border-black"
                    onBlur={(e: any) => e.preventDefault()}
                    id="comment-subject"
                    name="subject"
                    maxLength={140}
                    autoFocus
                />

                <ForumRichText
                    initialValue={body}
                    setFieldValue={(field: string, value: string) => setBody(value)}
                    onSubmit={handleSubmit}
                    mentions={true}
                    boxed={true}
                    borderClass="border-black"
                    className="bg-transparent min-h-[120px] lowercase"
                    placeholder={placeholder}
                    cta={
                        <div className="flex gap-2">
                            <OSButton
                                size="sm"
                                variant="primary"
                                disabled={!stripHtmlTags(body)}
                                onClick={handleSubmit}
                            >
                                <span className="lowercase">post</span>
                            </OSButton>
                            <OSButton
                                size="sm"
                                variant="default"
                                onClick={() => {
                                    setBody('')
                                    setSubject('')
                                    setIsActive(false)
                                }}
                            >
                                <span className="lowercase">cancel</span>
                            </OSButton>
                        </div>
                    }
                />
                <p className="text-[11px] opacity-40 mt-4 [text-wrap:balance] text-primary lowercase">
                    guidelines: please keep the discussion civil and constructive.
                </p>
            </div>
            <div className="clear-both" />
        </div>
    )
}
