'use client'

import React, { ChangeEvent, useEffect, useId, useState } from 'react'
import clsx from 'clsx'
import { IconInfo } from '@posthog/icons'

export interface LemonCheckboxProps {
    checked?: boolean | 'indeterminate'
    defaultChecked?: boolean
    disabled?: boolean
    disabledReason?: string | null | false
    onChange?: (value: boolean, event: ChangeEvent<HTMLInputElement>) => void
    label?: string | JSX.Element
    info?: React.ReactNode
    id?: string
    className?: string
    labelClassName?: string
    fullWidth?: boolean
    size?: 'xsmall' | 'small' | 'medium'
    bordered?: boolean
    color?: string
    'data-attr'?: string
    stopPropagation?: boolean
}

export function LemonCheckbox({
    checked,
    defaultChecked,
    disabled,
    disabledReason,
    onChange,
    label,
    info,
    id: rawId,
    className,
    labelClassName,
    fullWidth,
    bordered,
    color,
    size,
    'data-attr': dataAttr,
    stopPropagation,
}: LemonCheckboxProps): JSX.Element {
    const indeterminate = checked === 'indeterminate'
    const isDisabled = disabled || !!disabledReason

    const autoId = useId()
    const id = rawId || autoId
    const [localChecked, setLocalChecked] = useState(indeterminate || (checked ?? defaultChecked ?? false))
    const [wasIndeterminateLast, setWasIndeterminateLast] = useState(false)

    useEffect(() => {
        if (checked !== undefined) {
            setLocalChecked(!!checked)
        }
    }, [checked])

    useEffect(() => {
        if (checked) {
            setWasIndeterminateLast(indeterminate)
        }
    }, [checked, indeterminate])

    return (
        <span
            className={clsx(
                'LemonCheckbox',
                localChecked && 'LemonCheckbox--checked',
                wasIndeterminateLast && 'LemonCheckbox--indeterminate',
                bordered && 'LemonCheckbox--bordered',
                isDisabled && 'LemonCheckbox--disabled',
                fullWidth && 'LemonCheckbox--full-width',
                size && `LemonCheckbox--${size}`,
                className
            )}
            data-attr={dataAttr}
            title={disabledReason ? String(disabledReason) : undefined}
            onClick={(e) => {
                if (stopPropagation) {
                    e.stopPropagation()
                }
            }}
        >
            <input
                className="LemonCheckbox__input"
                type="checkbox"
                checked={localChecked}
                defaultChecked={defaultChecked}
                onChange={(e) => {
                    if (checked === undefined) {
                        setLocalChecked(e.target.checked)
                    }
                    onChange?.(e.target.checked, e)
                }}
                id={id}
                disabled={isDisabled}
            />
            <label
                htmlFor={id}
                style={color ? ({ '--box-color': color } as React.CSSProperties) : undefined}
                className={labelClassName}
            >
                <svg
                    className="LemonCheckbox__box"
                    fill="none"
                    height="16"
                    viewBox="0 0 16 16"
                    width="16"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d={!wasIndeterminateLast ? 'm3.5 8 3 3 6-6' : 'm3.5 8h9'} strokeWidth="2" />
                </svg>
                {label && <span className="LemonCheckbox__label">{label}</span>}
                {info && (
                    <span title={typeof info === 'string' ? info : undefined} className="LemonCheckbox__info">
                        <IconInfo className="LemonCheckbox__info-icon" />
                    </span>
                )}
            </label>
        </span>
    )
}
