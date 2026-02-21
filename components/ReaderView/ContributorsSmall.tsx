"use client"

import React from 'react'
import CloudinaryImage from 'components/CloudinaryImage'
import { IconUser } from '@posthog/icons'
import { useApp } from 'context/App'

interface Contributor {
    name: string
    image?: string
    color?: string
    username?: string
}

export const ContributorsSmall = ({ contributors }: { contributors?: Contributor[] }) => {
    const { addWindow } = useApp()

    return contributors?.[0] ? (
        <div className="not-prose">
            <ul className="flex space-x-2 list-none p-0 m-0">
                {contributors.map(({ name, image, color, username }) => {
                    const profileKey = `profile-${(username || name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                    const profilePath = `/profile/${encodeURIComponent(username || name)}`

                    return (
                        <li className="!mb-0 flex items-center gap-2" key={name}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    addWindow({
                                        key: profileKey,
                                        path: profilePath,
                                        title: `${username || name} profile`,
                                        size: { width: 900, height: 680 }
                                    })
                                }}
                                className="flex items-center gap-2 rounded px-1 py-0.5 border border-transparent hover:border-primary hover:bg-accent/60 transition-colors"
                            >
                                {image ? (
                                    <CloudinaryImage
                                        width={24}
                                        className={`w-6 h-6 border border-primary rounded-full overflow-hidden bg-${color ? color : 'red'
                                            }`}
                                        src={image}
                                    />
                                ) : (
                                    <div className="w-6 h-6 border border-primary rounded-full bg-accent flex items-center justify-center">
                                        <IconUser className="size-3.5 text-primary/50" />
                                    </div>
                                )}
                                <span className="text-sm font-semibold">{name}</span>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    ) : null
}
