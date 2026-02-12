"use client"

import React from 'react'
import ForumAvatar from './ForumAvatar'
import { ForumProfile } from './types'
import Link from 'components/Link'

interface ForumProfileBadgeProps {
    profile: ForumProfile
    className?: string
}

export default function ForumProfileBadge({ profile, className = '' }: ForumProfileBadgeProps) {
    return (
        <Link
            className={`flex items-center relative !no-underline hover:!underline ${className}`}
            to={`/community/profiles/${profile.id}`}
        >
            <div className="w-[44px] h-[44px] ml-[-2px] rounded-full mr-[10px] overflow-hidden">
                <ForumAvatar
                    className="w-[40px]"
                    image={profile.avatar}
                    color={profile.color}
                />
            </div>
            <strong className="text-primary">{profile.firstName || 'Anonymous'}</strong>
        </Link>
    )
}
