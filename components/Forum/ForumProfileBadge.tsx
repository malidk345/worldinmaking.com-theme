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
            className={`flex items-center relative !no-underline hover:!underline ${className}`}
            to={`/profile/${profile.firstName}`}
        >
            <div className="w-[44px] h-[44px] ml-[-2px] rounded-full mr-[10px] overflow-hidden relative">
                <ForumAvatar
                    className="w-[40px] rounded-full"
                    image={profile.avatar}
                    color={profile.color}
                    isTeamMember={isTeamMember}
                />
            </div>
            <strong className="text-primary">{profile.firstName || 'Anonymous'}</strong>
        </Link>
    )
}
