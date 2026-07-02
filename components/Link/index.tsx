"use client"

import React from 'react'
import NextLink from 'next/link'
import { useApp } from '../../context/App'
import { useWindow } from '../../context/Window'

export interface LinkState {
    newWindow?: boolean
    [key: string]: unknown
}

export interface Props {
    to: string
    children: React.ReactNode
    className?: string
    external?: boolean
    externalNoIcon?: boolean
    state?: LinkState
    newWindow?: boolean
    onClick?: (e: React.MouseEvent) => void
    [key: string]: unknown
}

export default function Link({
    to,
    children,
    className = '',
    external,
    onClick,
    ...other
}: Props) {
    const { addWindow } = useApp()
    const { appWindow } = useWindow()

    // Strip non-DOM props so they don't get spread onto <a> / <NextLink>
    const { state, newWindow, ...domProps } = other

    const handleClick = (e: React.MouseEvent) => {
        if (onClick) onClick(e)

        // If it's an internal link
        if (to && to.startsWith('/')) {
            const target = e.target as HTMLElement
            const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : null
            const fromOrigin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined

            // Case 1: Force a new window (fake OS window)
            if (state?.newWindow || newWindow) {
                e.preventDefault()
                addWindow({
                    key: `${to}-${Date.now()}`,
                    path: to,
                    title: to.split('/').pop() || 'window',
                    fromOrigin
                })
                return
            }

            // Case 2: Inside a window — decide between in-window nav or new window
            // Cross-type links (e.g. post → profile) open as new windows on everywhere.
            // Same-type links (post → post) navigate within current window.
            if (appWindow && appWindow.key !== 'home') {
                e.preventDefault()
                addWindow({
                    key: `${to}-${Date.now()}`,
                    path: to,
                    title: to.split('/').pop() || 'window',
                    fromOrigin
                })
                return
            }
        }
    }

    if (external || (to && (to.startsWith('http') || to.startsWith('https')))) {
        return (
            <a href={to} className={className} target="_blank" rel="noopener noreferrer" onClick={handleClick} {...domProps}>
                {children}
            </a>
        )
    }

    return (
        <NextLink href={to || '#'} className={className} onClick={handleClick} {...domProps}>
            {children}
        </NextLink>
    )
}
