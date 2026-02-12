"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import ForumRichText from './ForumRichText'
import ForumAvatar from './ForumAvatar'
import { useAuth } from 'context/AuthContext'

interface ForumReplyFormProps {
    isInForum?: boolean
    archived?: boolean
    onSubmit?: (content: string) => void
}

export default function ForumReplyForm({ isInForum = false, archived = false, onSubmit }: ForumReplyFormProps) {
    const [body, setBody] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const { profile } = useAuth()

    const handleSubmit = () => {
        if (body.trim()) {
            onSubmit?.(body)
            setBody('')
            setIsOpen(false)
        }
    }

    if (!isOpen) {
        return (
            <div className={`flex items-center space-x-3 ${archived ? 'opacity-25 pointer-events-none' : ''}`}>
                <div className="w-[28px] h-[28px] rounded-full overflow-hidden shrink-0">
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
                    className="border border-primary bg-accent/20 !p-2 text-primary/60 font-medium"
                >
                    Reply
                </OSButton>
            </div>
        )
    }

    return (
        <div className={`relative ${archived ? 'opacity-25 pointer-events-none' : ''}`}>
            <div className="w-[40px] h-[40px] float-left rounded-full overflow-hidden shrink-0">
                <ForumAvatar
                    className="w-full h-full"
                    image={profile?.avatar_url}
                />
            </div>
            <div className="pl-[55px]">
                <ForumRichText
                    initialValue={body}
                    setFieldValue={(field: string, value: string) => setBody(value)}
                    onSubmit={handleSubmit}
                    autoFocus
                    className="bg-transparent min-h-[100px]"
                    placeholder="Type your reply..."
                    cta={
                        <div className="flex gap-2">
                            <OSButton
                                size="sm"
                                variant="primary"
                                disabled={!body.trim()}
                                onClick={handleSubmit}
                            >
                                Post
                            </OSButton>
                            <OSButton
                                size="sm"
                                variant="default"
                                onClick={() => setIsOpen(false)}
                            >
                                Cancel
                            </OSButton>
                        </div>
                    }
                />
            </div>
            <div className="clear-both" />
        </div>
    )
}
