"use client"

import React from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ForumProfile } from './types'
import ForumAvatar from './ForumAvatar'
import Link from 'components/Link'
import Tooltip from 'components/RadixUI/Tooltip'

dayjs.extend(relativeTime)

interface ForumDaysProps {
    created: string
    edits?: any[]
    profile?: ForumProfile
}

const EditItem = ({ profile, date, text }: { profile: ForumProfile; date: string; text: string }) => {
    return (
        <li className="border-b-half border-input last:border-b-0 mb-2 pb-2 last:pb-0 last:mb-0 text-primary list-none">
            <span className="flex items-center space-x-1 text-sm">
                <ForumAvatar image={profile.avatar} color={profile.color} className="size-6" />
                <span>
                    <Link
                        to={`/profile/${profile.firstName}`}
                        className="font-semibold hover:underline"
                    >
                        {profile.firstName || 'Anonymous'}
                    </Link>{' '}
                    <span className="text-secondary">{text}</span> <span>{dayjs(date).fromNow()}</span>
                </span>
            </span>
        </li>
    )
}

export default function ForumDays({ created, edits = [], profile }: ForumDaysProps) {
    const hasEdits = edits?.length > 0
    if (!created) {
        return null
    }

    return (
        <Tooltip
            trigger={
                <div className="max-h-[160px] overflow-y-auto">
                    <span className="text-sm text-muted relative cursor-default">
                        {hasEdits ? 'Edited ' : ''}
                        {dayjs(hasEdits ? edits[0].date : created).fromNow()}
                    </span>
                </div>
            }
            delay={0}
            sideOffset={-5}
        >
            {hasEdits ? (
                <ul className="m-0 p-0 list-none">
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
            ) : (
                dayjs(created).format('MM/DD/YYYY - h:mm A')
            )}
        </Tooltip>
    )
}
