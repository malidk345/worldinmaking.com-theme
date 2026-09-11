import React, { forwardRef, useRef, useState } from 'react'
import clsx from 'clsx'
import { IconSearch, IconX } from '@posthog/icons'

export interface LemonInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'prefix' | 'type'> {
    type?: 'text' | 'email' | 'search' | 'url' | 'password' | 'number' | 'time'
    value?: string | number
    defaultValue?: string
    onChange?: (value: string) => void
    onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void
    placeholder?: string
    status?: 'default' | 'danger'
    size?: 'xsmall' | 'small' | 'medium' | 'large'
    fullWidth?: boolean
    allowClear?: boolean
    prefix?: React.ReactElement | null
    suffix?: React.ReactElement | null
    disabled?: boolean
    disabledReason?: React.ReactNode | null | false
    transparentBackground?: boolean
    inputRef?: React.Ref<HTMLInputElement>
    'data-attr'?: string
    'aria-label'?: string
}

export const LemonInput = forwardRef<HTMLDivElement, LemonInputProps>(function LemonInput(
    {
        type = 'text',
        value,
        defaultValue,
        onChange,
        onPressEnter,
        placeholder,
        status = 'default',
        size = 'medium',
        fullWidth = false,
        allowClear = false,
        prefix,
        suffix,
        disabled = false,
        disabledReason,
        transparentBackground = false,
        inputRef,
        className,
        onKeyDown,
        ...rest
    },
    ref
) {
    const isDisabled = disabled || !!disabledReason
    const showSearch = type === 'search'

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onPressEnter?.(e)
        }
        onKeyDown?.(e)
    }

    return (
        <div
            ref={ref}
            className={clsx(
                'LemonInput',
                `LemonInput--${size}`,
                fullWidth && 'LemonInput--fullWidth',
                status === 'danger' && 'LemonInput--danger',
                isDisabled && 'LemonInput--disabled',
                transparentBackground && 'LemonInput--transparent',
                className
            )}
        >
            {(prefix || showSearch) && (
                <span className="LemonInput__prefix">
                    {prefix ?? (showSearch ? <IconSearch style={{ width: 14, height: 14 }} /> : null)}
                </span>
            )}
            <input
                ref={inputRef as React.Ref<HTMLInputElement>}
                type={type === 'search' ? 'text' : type}
                className="LemonInput__input"
                value={value}
                defaultValue={defaultValue}
                placeholder={placeholder}
                disabled={isDisabled}
                onChange={(e) => onChange?.(e.target.value)}
                onKeyDown={handleKeyDown}
                {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
            />
            {allowClear && value && (
                <span className="LemonInput__suffix" style={{ cursor: 'pointer' }} onClick={() => onChange?.('')}>
                    <IconX style={{ width: 14, height: 14 }} />
                </span>
            )}
            {suffix && !allowClear && (
                <span className="LemonInput__suffix">{suffix}</span>
            )}
        </div>
    )
})
