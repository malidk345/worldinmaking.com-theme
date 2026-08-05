import Link from 'next/link'
import React from 'react'
import { sanitizeNavigationUrl } from 'lib/utils'

export default function Card({
    children,
    url,
    className = '',
}: {
    children: JSX.Element[]
    url: string
    className?: string
}): JSX.Element {
    const safeUrl = sanitizeNavigationUrl(url)
    const internal = /^\/(?!\/)/.test(safeUrl)
    const classes = `group bg-white rounded-[10px] overflow-hidden hover:shadow-xl hover:translate-y-[-2px] ${className}`
    return internal ? (
        <Link href={safeUrl} className={classes}>
            {children}
        </Link>
    ) : (
            <a href={safeUrl} target="_blank" rel="noreferrer noopener" className={classes}>
            {children}
        </a>
    )
}
