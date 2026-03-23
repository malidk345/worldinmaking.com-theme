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
    const { navigate, appWindow } = useWindow()

    // Strip non-DOM props so they don't get spread onto <a> / <NextLink>
    const { state, newWindow, ...domProps } = other

    const handleClick = (e: React.MouseEvent) => {
        if (onClick) onClick(e)

        // If it's an internal link
        if (to && to.startsWith('/')) {
            // Case 1: Force a new window (fake OS window)
            if (state?.newWindow || newWindow) {
                e.preventDefault()
                addWindow({
                    key: to,
                    path: to,
                    title: to.split('/').pop() || 'window'
                })
                return
            }

            // Case 2: Inside a window — decide between in-window nav or new window
            // Cross-type links (e.g. post → profile) open as new windows on everywhere.
            // Same-type links (post → post) navigate within current window.
            if (appWindow && appWindow.key !== 'home') {
                const currentBase = (appWindow.path || '').split('/')[1] || ''
                const targetBase = to.split('/')[1] || ''

                if (currentBase !== targetBase) {
                    e.preventDefault()
                    addWindow({
                        key: to,
                        path: to,
                        title: to.split('/').pop() || 'window'
                    })
                    return
                }

                if (navigate) {
                    e.preventDefault()
                    navigate(to)
                    return
                }
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
