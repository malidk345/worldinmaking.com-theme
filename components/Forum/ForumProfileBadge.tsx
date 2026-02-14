"use client"

import React from 'react'
import ForumAvatar from './ForumAvatar'
import { ForumProfile } from './types'
import Link from 'components/Link'
import Logomark from '../Home/images/Logomark'

interface ForumProfileBadgeProps {
    profile: ForumProfile
    className?: string
}

export default function ForumProfileBadge({ profile, className = '' }: ForumProfileBadgeProps) {
    const isTeamMember = profile.id === 1 || profile.firstName?.toLowerCase().includes('ai')

    return (
        <Link
            className={`flex items-center relative !no-underline hover:!underline !text-primary ${className}`}
            to={`/community/profiles/${profile.id}`}
        >
            <div className="mr-2 relative ml-[-2px]">
                <ForumAvatar
                    className="size-[40px] rounded-full"
                    image={profile.avatar}
                    color={profile.color}
                    isTeamMember={isTeamMember}
                />
            </div>
            <strong className="text-primary">{profile.firstName || 'Anonymous'}</strong>
        </Link>
    )
}
