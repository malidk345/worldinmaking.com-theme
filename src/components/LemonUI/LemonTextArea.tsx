'use client'

import React, { forwardRef, ReactElement, useRef } from 'react'
import clsx from 'clsx'

interface LemonTextAreaPropsBase extends Pick<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'onFocus' | 'onBlur' | 'maxLength' | 'onKeyDown'
> {
    id?: string
    value?: string
    placeholder?: string
    className?: string
    disabled?: boolean
    ref?: React.Ref<HTMLTextAreaElement>
    onChange?: (newValue: string) => void
    minRows?: number
    maxRows?: number
    rows?: number
    autoFocus?: boolean
    stopPropagation?: boolean
    'data-attr'?: string
    hideFocus?: boolean
    actions?: ReactElement[]
    rightFooter?: ReactElement
}

export interface LemonTextAreaWithCmdEnterProps extends LemonTextAreaPropsBase {
    onPressCmdEnter?: (currentValue: string) => void
    onPressEnter?: never
}

export interface LemonTextAreaWithEnterProps extends LemonTextAreaPropsBase {
    onPressEnter: (currentValue: string) => void
    onPressCmdEnter?: never
}

export type LemonTextAreaProps = LemonTextAreaWithEnterProps | LemonTextAreaWithCmdEnterProps

export const LemonTextArea = forwardRef<HTMLTextAreaElement, LemonTextAreaProps>(function LemonTextArea(
    {
        className,
        onChange,
        onPressEnter,
        onPressCmdEnter,
        minRows = 3,
        rows,
        onKeyDown,
        stopPropagation,
        actions,
        rightFooter,
        autoFocus,
        hideFocus = false,
        value,
        ...textProps
    },
    ref
): JSX.Element {
    const backupRef = useRef<HTMLTextAreaElement | null>(null)
    const textRef = ref || backupRef

    const hasFooter = (actions || []).length || textProps.maxLength || rightFooter
    const textLength = value?.length ?? 0

    return (
        <div className={clsx('LemonTextArea__wrapper', !hideFocus && 'LemonTextArea__wrapper--focus', className)}>
            <textarea
                ref={textRef as any}
                rows={rows || minRows}
                value={value}
                className={clsx('LemonTextArea', hasFooter && 'LemonTextArea--has-footer')}
                onKeyDown={(e) => {
                    if (stopPropagation) {
                        e.stopPropagation()
                    }
                    if (e.key === 'Enter') {
                        const target = e.currentTarget
                        if (!e.shiftKey) {
                            if ((e.metaKey || e.ctrlKey) && onPressCmdEnter) {
                                onPressCmdEnter(target.value)
                                e.preventDefault()
                            } else if (onPressEnter) {
                                onPressEnter(target.value)
                                e.preventDefault()
                            }
                        }
                    }
                    onKeyDown?.(e)
                }}
                onChange={(event) => {
                    if (stopPropagation) {
                        event.stopPropagation()
                    }
                    return onChange?.(event.currentTarget.value ?? '')
                }}
                autoFocus={!!autoFocus}
                {...textProps}
            />
            {hasFooter ? (
                <div className="LemonTextArea__footer">
                    <div className="LemonTextArea__actions">{actions}</div>
                    <div className="LemonTextArea__footer-right">
                        {rightFooter}
                        {textProps.maxLength ? (
                            <div className={clsx('LemonTextArea__counter', textLength >= textProps.maxLength && 'LemonTextArea__counter--error')}>
                                {textLength} / {textProps.maxLength}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    )
})
