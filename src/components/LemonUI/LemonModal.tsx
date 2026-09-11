'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { IconX } from '@posthog/icons'
import { LemonButton } from './LemonButton'

interface LemonModalInnerProps {
    children?: React.ReactNode
    className?: string
}

export interface LemonModalContentProps extends LemonModalInnerProps {
    embedded?: boolean
}

export interface LemonModalProps {
    children?: React.ReactNode
    isOpen?: boolean
    onClose?: () => void
    onAfterClose?: () => void
    width?: number | string
    maxWidth?: number | string
    inline?: boolean
    title?: React.ReactNode
    description?: React.ReactNode
    footer?: React.ReactNode
    simple?: boolean
    closable?: boolean
    hideCloseButton?: boolean
    fullScreen?: boolean
    'data-attr'?: string
    className?: string
    overlayClassName?: string
}

export const LemonModalHeader = ({ children, className }: LemonModalInnerProps): JSX.Element => {
    return <header className={clsx('LemonModal__header', className)}>{children}</header>
}

export const LemonModalFooter = ({ children, className }: LemonModalInnerProps): JSX.Element => {
    return <footer className={clsx('LemonModal__footer', className)}>{children}</footer>
}

export const LemonModalContent = ({ children, className, embedded = false }: LemonModalContentProps): JSX.Element => {
    return (
        <section className={clsx('LemonModal__content', embedded && 'LemonModal__content--embedded', className)}>
            {children}
        </section>
    )
}

export function LemonModal({
    width,
    maxWidth,
    children,
    isOpen = true,
    onClose,
    onAfterClose,
    title,
    description,
    footer,
    inline,
    simple,
    closable = true,
    fullScreen = false,
    hideCloseButton = false,
    'data-attr': dataAttr,
    className,
    overlayClassName,
}: LemonModalProps): JSX.Element | null {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && closable) {
                onClose?.()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, closable, onClose])

    if (!isOpen) {
        onAfterClose?.()
        return null
    }

    const modalContent = (
        <div className="LemonModal__container" data-attr={dataAttr}>
            {closable && !hideCloseButton && (
                <div className="LemonModal__close">
                    <LemonButton
                        icon={<IconX />}
                        size="small"
                        type="tertiary"
                        onClick={onClose}
                        aria-label="close"
                    />
                </div>
            )}
            <div className="LemonModal__layout">
                {simple ? (
                    children
                ) : (
                    <>
                        {title ? (
                            <LemonModalHeader>
                                <h3>{title}</h3>
                                {description ? (
                                    typeof description === 'string' ? (
                                        <p>{description}</p>
                                    ) : (
                                        description
                                    )
                                ) : null}
                            </LemonModalHeader>
                        ) : null}

                        {children ? <LemonModalContent>{children}</LemonModalContent> : null}
                        {footer ? <LemonModalFooter>{footer}</LemonModalFooter> : null}
                    </>
                )}
            </div>
        </div>
    )

    if (inline) {
        return (
            <div className="LemonModal" style={{ width, maxWidth }}>
                {modalContent}
            </div>
        )
    }

    if (!mounted) return null

    return createPortal(
        <div
            className={clsx('LemonModal__overlay', overlayClassName)}
            onClick={(e) => {
                if (e.target === e.currentTarget && closable) {
                    onClose?.()
                }
            }}
        >
            <div
                className={clsx('LemonModal', fullScreen && 'LemonModal--fullscreen', className)}
                style={{ width: fullScreen ? undefined : width, maxWidth: fullScreen ? undefined : maxWidth }}
            >
                {modalContent}
            </div>
        </div>,
        document.body
    )
}

LemonModal.Header = LemonModalHeader
LemonModal.Footer = LemonModalFooter
LemonModal.Content = LemonModalContent
