"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import ForumRichText from './ForumRichText'
import ForumAvatar from './ForumAvatar'
import { useAuth } from 'context/AuthContext'
import { stripHtmlTags } from 'utils/security'

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
        if (stripHtmlTags(body)) {
            onSubmit?.(body)
            setBody('')
            setIsOpen(false)
        }
    }

    if (!isOpen) {
        return (
            <div className={`p-1 flex items-center space-x-3 ${archived ? 'opacity-25 pointer-events-none' : ''}`}>
                <div className="w-[30px] h-[30px] ml-[-2px] rounded-full overflow-hidden shrink-0">
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
                    className="border border-border bg-accent/70 hover:bg-accent !p-2"
                >
                    <span className="font-bold text-primary">Reply</span>
                </OSButton>
            </div>
        )
    }

    return (
        <div className={`relative ${archived ? 'opacity-25 pointer-events-none' : ''}`}>
            <div className="w-[40px] h-[40px] float-left ml-[-2px] rounded-full overflow-hidden shrink-0">
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
                    boxed={false}
                    className="bg-transparent min-h-[100px]"
                    placeholder="Type your reply..."
                    cta={
                        <div className="flex gap-2">
                            <OSButton
                                size="sm"
                                variant="primary"
                                disabled={!stripHtmlTags(body)}
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
