'use client'

import React from 'react'
import { LemonButton } from './LemonButton'
import { IconCheckCircle, IconInfo, IconWarning, IconX } from '@posthog/icons'

export interface ToastButton {
    label: string
    action: (() => void) | (() => Promise<void>)
    dataAttr?: string
    className?: string
}

export interface ToastContentProps {
    type: 'info' | 'success' | 'warning' | 'error'
    message: string | JSX.Element
    button?: ToastButton
    id?: number | string
}

export function ToastContent({ type, message, button }: ToastContentProps): JSX.Element {
    return (
        <div className="LemonToast__content" data-attr={`${type}-toast`}>
            <span className="LemonToast__message">{message}</span>
            {button && (
                <LemonButton
                    onClick={() => {
                        void button.action()
                    }}
                    type="secondary"
                    size="small"
                    data-attr={button.dataAttr}
                    className={button.className}
                >
                    {button.label}
                </LemonButton>
            )}
        </div>
    )
}

export const lemonToast = {
    info(message: string | JSX.Element, options: any = {}) {
        return 'toast-info'
    },
    loading(message: string | JSX.Element, options: any = {}) {
        return 'toast-loading'
    },
    success(message: string | JSX.Element, options: any = {}) {
        return 'toast-success'
    },
    warning(message: string | JSX.Element, options: any = {}) {
        console.warn('[lemonToast.warning]', message, options)
        return 'toast-warning'
    },
    error(message: string | JSX.Element, options: any = {}) {
        console.error('[lemonToast.error]', message, options)
        return 'toast-error'
    },
    dismiss(id?: number | string) {
    },
}
