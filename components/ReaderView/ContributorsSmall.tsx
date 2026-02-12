"use client"

import React from 'react'
import CloudinaryImage from 'components/CloudinaryImage'
import { IconUser } from '@posthog/icons'

interface Contributor {
    name: string
    image?: string
    color?: string
}

export const ContributorsSmall = ({ contributors }: { contributors?: Contributor[] }) => {
    return contributors?.[0] ? (
        <div className="not-prose">
            <ul className="flex space-x-2 list-none p-0 m-0">
                {contributors.map(({ name, image, color }) => {
                    return (
                        <li className="!mb-0 flex items-center gap-2" key={name}>
                            <div className="flex items-center gap-2">
                                {image ? (
                                    <CloudinaryImage
                                        width={24}
                                        className={`w-6 h-6 border border-primary rounded-full overflow-hidden bg-${color ? color : 'red'
                                            }`}
                                        src={image}
                                    />
                                ) : (
                                    <div className="w-6 h-6 border border-border rounded-full bg-accent flex items-center justify-center">
                                        <IconUser className="size-3.5 text-primary-text/50" />
                                    </div>
                                )}
                                <span className="text-sm font-semibold">{name}</span>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    ) : null
}
