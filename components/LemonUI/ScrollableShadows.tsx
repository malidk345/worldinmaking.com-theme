"use client"

/**
 * ScrollableShadows — PostHog-compatible scroll shadow wrapper.
 *
 * Replicates PostHog's @base-ui/react/scroll-area behaviour:
 * sets data-overflow-x-start / data-overflow-x-end on the root element
 * so that the CSS ::before/::after pseudo-elements show the inset shadows.
 *
 * CSS lives in lemon-ui.css (.ScrollableShadows, .ScrollableShadows__inner).
 */

import './lemon-ui.css'
import React, { useEffect, useRef } from 'react'

interface ScrollableShadowsProps {
    children: React.ReactNode
    className?: string
    innerClassName?: string
    /** 'horizontal' (default) | 'vertical' | 'both' */
    direction?: 'horizontal' | 'vertical' | 'both'
    style?: React.CSSProperties
    innerStyle?: React.CSSProperties
}

export function ScrollableShadows({
    children,
    className,
    innerClassName,
    direction = 'horizontal',
    style,
    innerStyle,
}: ScrollableShadowsProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const root = rootRef.current
        const inner = innerRef.current
        if (!root || !inner) return

        const update = () => {
            const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = inner

            // Horizontal overflow
            if (scrollLeft > 1) {
                root.setAttribute('data-overflow-x-start', '')
            } else {
                root.removeAttribute('data-overflow-x-start')
            }
            if (scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 1) {
                root.setAttribute('data-overflow-x-end', '')
            } else {
                root.removeAttribute('data-overflow-x-end')
            }

            // Vertical overflow
            if (scrollTop > 1) {
                root.setAttribute('data-overflow-y-start', '')
            } else {
                root.removeAttribute('data-overflow-y-start')
            }
            if (scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 1) {
                root.setAttribute('data-overflow-y-end', '')
            } else {
                root.removeAttribute('data-overflow-y-end')
            }
        }

        const ro = new ResizeObserver(update)
        ro.observe(inner)
        if (inner.firstElementChild) {
            ro.observe(inner.firstElementChild)
        }
        
        inner.addEventListener('scroll', update, { passive: true })
        // Run once immediately so initial overflow state is correct
        update()

        return () => {
            ro.disconnect()
            inner.removeEventListener('scroll', update)
        }
    }, [children])

    const innerCls = [
        'ScrollableShadows__inner',
        direction === 'vertical' ? 'ScrollableShadows__inner--vertical' : '',
        direction === 'both' ? 'ScrollableShadows__inner--both' : '',
        innerClassName ?? '',
    ].filter(Boolean).join(' ')

    return (
        <div
            ref={rootRef}
            className={['ScrollableShadows', className ?? ''].filter(Boolean).join(' ')}
            style={style}
        >
            <div
                ref={innerRef}
                className={innerCls}
                style={innerStyle}
            >
                {children}
            </div>
        </div>
    )
}

export default ScrollableShadows
