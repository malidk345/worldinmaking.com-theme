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
            <div className={`flex flex-1 space-x-3 ${className}`}>
                <div className="rounded-full overflow-hidden aspect-square w-[40px] shrink-0 border border-border">
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
                    className="border border-border bg-accent hover:bg-accent/80 transition-colors !p-3 min-h-[40px]"
                >
                    <span className="text-primary/60">{placeholder}</span>
                </OSButton>
            </div>
        )
    }

    return (
        <div className={`relative ${className}`}>
            <div className="w-[40px] h-[40px] float-left rounded-full overflow-hidden shrink-0 mt-1 border border-border">
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
                        <div className="flex justify-end gap-2 mt-3">
                            <OSButton
                                size="sm"
                                variant="default"
                                onClick={() => {
                                    setBody('')
                                    setIsActive(false)
                                }}
                            >
                                Cancel
                            </OSButton>
                            <OSButton
                                size="sm"
                                variant="primary"
                                disabled={!body.trim()}
                                onClick={handleSubmit}
                            >
                                Post Comment
                            </OSButton>
                        </div>
                    }
                />
            </div>
            <div className="clear-both" />
        </div>
    )
}
