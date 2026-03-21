"use client"

import React from 'react'
import CloudinaryImage from 'components/CloudinaryImage'
import { IconUser } from '@posthog/icons'
import { useApp } from 'context/App'
import { useWindow } from 'context/Window'

interface Contributor {
    name: string
    image?: string
    color?: string
    username?: string
}

export const ContributorsSmall = ({ contributors }: { contributors?: Contributor[] }) => {
    const { addWindow, isMobile } = useApp()
    const windowCtx = useWindow()

    return contributors?.[0] ? (
        <div className="not-prose">
            <ul className="flex space-x-2 list-none p-0 m-0">
                {contributors.map(({ name, image, username }) => {
                    const profileKey = `profile-${(username || name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                    const profilePath = `/profile/${encodeURIComponent(username || name)}`

                    return (
                        <li className="!mb-0 flex items-center gap-2 font-mono text-xs lowercase" key={name}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (isMobile && windowCtx?.navigate) {
                                        windowCtx.navigate(profilePath)
                                    } else {
                                        addWindow({
                                            key: profileKey,
                                            path: profilePath,
                                            title: `${username || name} profile`
                                        })
                                    }
                                }}
                                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                            >
                                {image ? (
                                    <CloudinaryImage
                                        width={20}
                                        className="w-5 h-5 border border-black/40 dark:border-white/30 rounded-sm overflow-hidden"
                                        src={image}
                                    />
                                ) : (
                                    <div className="w-5 h-5 border border-black/40 dark:border-white/30 rounded-sm bg-accent flex items-center justify-center">
                                        <IconUser className="size-3 text-black/60 dark:text-white/60" />
                                    </div>
                                )}
                                <span className="text-[10px] font-bold">@{(username || name).toLowerCase()}</span>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    ) : null
}
