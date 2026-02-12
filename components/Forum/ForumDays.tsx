"use client"

import React from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ForumProfile } from './types'
import ForumAvatar from './ForumAvatar'
import Link from 'components/Link'

dayjs.extend(relativeTime)

interface ForumDaysProps {
    created: string
    edits?: any[]
    profile?: ForumProfile
}

const EditItem = ({ profile, date, text }: { profile: ForumProfile; date: string; text: string }) => {
    return (
        <li className="border-b border-primary last:border-b-0 mb-2 pb-2 last:pb-0 last:mb-0 text-primary list-none">
            <span className="flex items-center space-x-1 text-sm">
                <ForumAvatar image={profile.avatar} color={profile.color} className="size-6" />
                <span>
                    <Link
                        to={`/community/profiles/${profile.id}`}
                        className="font-semibold hover:underline !no-underline"
                    >
                        {profile.firstName || 'Anonymous'}
                    </Link>{' '}
                    <span className="opacity-60">{text}</span> <span>{dayjs(date).fromNow()}</span>
                </span>
            </span>
        </li>
    )
}

export default function ForumDays({ created, edits = [], profile }: ForumDaysProps) {
    const hasEdits = edits && edits.length > 0
    if (!created) return null

    const displayDate = hasEdits ? edits[0].date : created

    return (
        <div className="group relative">
            <span className="text-sm text-primary opacity-40 cursor-default">
                {hasEdits ? 'Edited ' : ''}
                {dayjs(displayDate).fromNow()}
            </span>

            {/* Simple CSS-based tooltip for edits history to avoid complex dependencies for now */}
            {hasEdits && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-black border border-primary rounded-md shadow-xl z-50 hidden group-hover:block min-w-[200px]">
                    <ul className="m-0 p-0">
                        {edits.map((edit, idx) => (
                            <EditItem
                                key={idx}
                                profile={edit.by || profile}
                                date={edit.date}
                                text="edited"
                            />
                        ))}
                        {profile && (
                            <EditItem
                                profile={profile}
                                date={created}
                                text="posted"
                            />
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}
