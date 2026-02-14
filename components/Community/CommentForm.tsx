"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import { useAuth } from 'context/AuthContext'
import ForumAvatar from '../Forum/ForumAvatar'
import ForumRichText from '../Forum/ForumRichText'

interface CommentFormProps {
    onSubmit?: (content: string) => void
    className?: string
    placeholder?: string
}

export default function CommentForm({ onSubmit, className = '', placeholder = "Add a comment..." }: CommentFormProps) {
    const [body, setBody] = useState('')
    const [isActive, setIsActive] = useState(false)
    const { profile } = useAuth()

    const handleSubmit = () => {
        if (body.trim()) {
            onSubmit?.(body)
            setBody('')
            setIsActive(false)
        }
    }

    if (!isActive) {
        return (
            <div className={`flex flex-1 space-x-2 ${className}`}>
                <div className="rounded-full overflow-hidden aspect-square w-[40px] shrink-0 border border-primary">
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
                    className="border border-primary bg-accent !p-2 min-h-8"
                >
                    <span className="font-bold text-primary">{placeholder}</span>
                </OSButton>
            </div>
        )
    }

    return (
        <div className={`relative ${className}`}>
            <div className="w-[40px] h-[40px] float-left rounded-full overflow-hidden shrink-0 mt-1">
                <ForumAvatar
                    className="w-full h-full"
                    image={profile?.avatar_url}
                />
            </div>
            <div className="pl-[55px] space-y-2">
                <ForumRichText
                    initialValue={body}
                    setFieldValue={(field: string, value: string) => setBody(value)}
                    onSubmit={handleSubmit}
                    mentions={true}
                    boxed={false}
                    className="bg-transparent min-h-[120px]"
                    placeholder={placeholder}
                    cta={
                        <div className="flex justify-end mt-2">
                            <OSButton
                                size="sm"
                                variant="primary"
                                disabled={!body.trim()}
                                onClick={handleSubmit}
                            >
                                Post
                            </OSButton>
                        </div>
                    }
                />
                <p className="text-xs text-center mt-4 [text-wrap:_balance] opacity-60 mb-0 text-primary">
                    If you need to share personal info relating to a bug or issue with your account, we
                    suggest filing a support ticket in the app.
                </p>
            </div>
            <div className="clear-both" />
        </div>
    )
}
