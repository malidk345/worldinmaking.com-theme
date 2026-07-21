"use client"

/**
 * PostMetaTable — standalone post metadata table.
 * Now implemented as a responsive vertical list inside LemonCollapse.
 */

import '../LemonUI/lemon-ui.css'
import React from 'react'
import { LemonTag, Lettermark } from '../LemonUI'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

interface Contributor {
    name: string
    image?: string
    username?: string
}

interface Tag {
    label: string
    url?: string
}

interface PostMetaTableProps {
    contributors?: Contributor[]
    date?: string
    readTime?: number
    tags?: Tag[]
}

export default function PostMetaTable({ contributors, date, readTime, tags }: PostMetaTableProps) {
    if (!date && (!contributors || contributors.length === 0) && (!tags || tags.length === 0)) {
        return null
    }

    return (
        <div className="flex flex-col gap-4 p-4 text-[13px] leading-relaxed">
            {/* Created by */}
            {contributors && contributors.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    <span className="font-semibold text-secondary">Created by</span>
                    <div className="flex items-center gap-2" title={contributors.map(c => `@${c.name}`).join(', ')}>
                        <div className="flex -space-x-1 items-center shrink-0">
                            {contributors.slice(0, 4).map((c) => (
                                c.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        key={c.name}
                                        src={c.image}
                                        alt={c.name}
                                        className="size-6 rounded-full object-cover border border-primary/20 shrink-0"
                                    />
                                ) : (
                                    <Lettermark key={c.name} name={c.name} size="sm" />
                                )
                            ))}
                        </div>
                        <span className="truncate text-[13px] font-mono text-primary">
                            @{contributors[0].username || contributors[0].name}
                            {contributors.length > 1 && (
                                <span className="opacity-50"> +{contributors.length - 1}</span>
                            )}
                        </span>
                    </div>
                </div>
            )}

            {/* Created date */}
            {date && (
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-black/60 dark:text-white/60">Created</span>
                    <span>{dayjs.utc(date).format('MMM D, YYYY')}</span>
                </div>
            )}

            {/* Read time */}
            {readTime !== undefined && (
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-black/60 dark:text-white/60">Read time</span>
                    <span>{readTime} min read</span>
                </div>
            )}

            {/* Tags */}
            {tags && tags.length > 0 && (
                <div className="flex flex-col gap-2 mt-1">
                    <span className="font-semibold text-black/60 dark:text-white/60">Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                            tag.url && tag.url !== '#' ? (
                                <a key={`${tag.label}-${tag.url}`} href={tag.url} className="hover:opacity-75 transition-opacity">
                                    <LemonTag>{tag.label.toLowerCase()}</LemonTag>
                                </a>
                            ) : (
                                <LemonTag key={tag.label}>{tag.label.toLowerCase()}</LemonTag>
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
