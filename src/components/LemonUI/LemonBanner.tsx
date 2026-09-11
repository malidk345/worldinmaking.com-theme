'use client'

import React, { useState, useEffect } from 'react'
import clsx from 'clsx'
import { IconInfo, IconSparkles, IconWarning, IconX } from '@posthog/icons'
import { LemonButton, LemonButtonProps } from './LemonButton'

export interface LemonBannerAction extends Omit<LemonButtonProps, 'type'> {
    children?: React.ReactNode
}

export interface LemonBannerProps {
    type: 'info' | 'warning' | 'error' | 'success' | 'ai'
    onClose?: () => void
    children: React.ReactNode
    action?: LemonBannerAction
    className?: string
    dismissKey?: string
    hideIcon?: boolean
    square?: boolean
    icon?: React.ReactNode
}

export function LemonBanner({
    type,
    onClose,
    children,
    action,
    className,
    dismissKey = '',
    hideIcon,
    square = false,
    icon,
}: LemonBannerProps): JSX.Element | null {
    const [isDismissed, setIsDismissed] = useState(false)

    useEffect(() => {
        if (dismissKey && typeof window !== 'undefined') {
            const dismissed = localStorage.getItem(`lemon-banner-dismissed-${dismissKey}`)
            if (dismissed === 'true') {
                setIsDismissed(true)
            }
        }
    }, [dismissKey])

    const handleClose = (): void => {
        if (dismissKey && typeof window !== 'undefined') {
            localStorage.setItem(`lemon-banner-dismissed-${dismissKey}`, 'true')
            setIsDismissed(true)
        }
        onClose?.()
    }

    if (isDismissed) {
        return null
    }

    const showCloseButton = dismissKey || onClose

    return (
        <div
            className={clsx(
                'LemonBanner',
                `LemonBanner--${type}`,
                square && 'LemonBanner--square',
                className
            )}
        >
            <div className="LemonBanner__main">
                {!hideIcon &&
                    (icon ? (
                        icon
                    ) : type === 'warning' || type === 'error' ? (
                        <IconWarning className="LemonBanner__icon" />
                    ) : type === 'ai' ? (
                        <IconSparkles className="LemonBanner__icon" />
                    ) : (
                        <IconInfo className="LemonBanner__icon" />
                    ))}
                <div className="LemonBanner__content">{children}</div>
                {action && <LemonButton type="secondary" size="small" {...action} />}
                {showCloseButton && (
                    <LemonButton size="xsmall" type="tertiary" icon={<IconX />} onClick={handleClose} aria-label="close" />
                )}
            </div>
        </div>
    )
}
