"use client"

import React from 'react'
import NextLink from 'next/link'
import { useApp } from '../../context/App'
import { useWindow } from '../../context/Window'

export interface LinkState {
    newWindow?: boolean
    [key: string]: unknown
}

export interface Props extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
    to: string
    children: React.ReactNode
    className?: string
    external?: boolean
    externalNoIcon?: boolean
    state?: LinkState
    newWindow?: boolean
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
    [key: string]: unknown
}

const Link = React.forwardRef<HTMLAnchorElement, Props>(({
    to,
    children,
    className = '',
    external,
    onClick,
    ...other
}, ref) => {
    const { addWindow } = useApp()
    const { appWindow } = useWindow()

    // Strip non-DOM props so they don't get spread onto <a> / <NextLink>
    const { state, newWindow, externalNoIcon: _externalNoIcon, ...domProps } = other

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (typeof onClick === 'function') {
            onClick(e)
            if (e.defaultPrevented) return
        }

        // If it's an internal link
        if (typeof to === 'string' && to.startsWith('/')) {
            const target = e.target as HTMLElement
            const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : null
            const fromOrigin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined

            // Case 1: Force a new window (fake OS window)
            const typedState = state as LinkState | undefined;
            if (typedState?.newWindow || newWindow) {
                e.preventDefault()
                addWindow({
                    key: `${to}-${Date.now()}`,
                    path: to,
                    title: typeof to === 'string' ? to.split('/').pop() || 'window' : 'window',
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
                    title: typeof to === 'string' ? to.split('/').pop() || 'window' : 'window',
                    fromOrigin
                })
                return
            }
        }
    }

    if (external || (typeof to === 'string' && (to.startsWith('http') || to.startsWith('https')))) {
        return (
            <a href={to as string} className={className as string | undefined} target="_blank" rel="noopener noreferrer" onClick={handleClick} ref={ref} {...(domProps as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>)}>
                {children as React.ReactNode}
            </a>
        )
    }

    return (
        <NextLink href={to as string || '#'} className={className as string | undefined} onClick={handleClick} ref={ref} {...(domProps as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>)}>
            {children as React.ReactNode}
        </NextLink>
    )
})

Link.displayName = 'Link'

export default Link
