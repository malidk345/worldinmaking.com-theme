'use client'

import React, { forwardRef, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

export interface LemonDropdownProps {
    overlay: React.ReactNode
    visible?: boolean
    startVisible?: boolean
    onVisibilityChange?: (visible: boolean) => void
    closeOnClickInside?: boolean
    trigger?: 'click' | 'hover'
    placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'left' | 'right' | string
    className?: string
    children: React.ReactElement
    matchWidth?: boolean
}

export const LemonDropdown = forwardRef<HTMLDivElement, LemonDropdownProps>(function LemonDropdown(
    {
        overlay,
        visible,
        startVisible = false,
        onVisibilityChange,
        closeOnClickInside = true,
        trigger = 'click',
        placement = 'bottom-start',
        className,
        children,
        matchWidth,
    },
    ref
) {
    const isControlled = visible !== undefined
    const [localVisible, setLocalVisible] = useState(startVisible)
    const effectiveVisible = isControlled ? visible : localVisible

    const containerRef = useRef<HTMLDivElement>(null)

    const setVisible = (val: boolean) => {
        if (!isControlled) {
            setLocalVisible(val)
        }
        onVisibilityChange?.(val)
    }

    useEffect(() => {
        if (!effectiveVisible) return

        const handleOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setVisible(false)
            }
        }
        document.addEventListener('mousedown', handleOutsideClick)
        return () => document.removeEventListener('mousedown', handleOutsideClick)
    }, [effectiveVisible])

    return (
        <div
            ref={containerRef}
            className={clsx('LemonDropdown__container', className)}
            onMouseEnter={() => {
                if (trigger === 'hover') setVisible(true)
            }}
            onMouseLeave={() => {
                if (trigger === 'hover') setVisible(false)
            }}
        >
            <div
                onClick={(e) => {
                    if (trigger === 'click') {
                        setVisible(!effectiveVisible)
                    }
                    children.props.onClick?.(e)
                }}
            >
                {children}
            </div>

            {effectiveVisible && (
                <div
                    ref={ref}
                    className={clsx(
                        'LemonDropdown__overlay',
                        `LemonDropdown__overlay--${placement}`,
                        matchWidth && 'LemonDropdown__overlay--match-width'
                    )}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (closeOnClickInside) {
                            setVisible(false)
                        }
                    }}
                >
                    {overlay}
                </div>
            )}
        </div>
    )
})
