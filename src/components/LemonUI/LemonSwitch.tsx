'use client'

import React, { forwardRef, useId, useState } from 'react'
import clsx from 'clsx'
import { Spinner } from './Spinner'

export interface LemonSwitchProps {
    className?: string
    onChange?: (newChecked: boolean) => void
    checked: boolean | 'indeterminate'
    label?: string | JSX.Element
    labelClassName?: string
    id?: string
    fullWidth?: boolean
    size?: 'xxsmall' | 'xsmall' | 'small' | 'medium'
    bordered?: boolean
    disabled?: boolean
    disabledReason?: string | null | false
    'data-attr'?: string
    tooltip?: string | JSX.Element | null
    'aria-label'?: string
    loading?: boolean
}

export const LemonSwitch = forwardRef<HTMLDivElement, LemonSwitchProps>(function LemonSwitch(
    {
        className,
        id: rawId,
        onChange,
        checked,
        fullWidth,
        bordered,
        size = 'medium',
        disabled,
        disabledReason,
        label,
        labelClassName,
        tooltip,
        'data-attr': dataAttr,
        'aria-label': ariaLabel,
        loading = false,
    },
    ref
): JSX.Element {
    const autoId = useId()
    const id = rawId || autoId
    const [isActive, setIsActive] = useState(false)

    const isDisabled = disabled || !!disabledReason || loading
    const tooltipText = disabledReason ? String(disabledReason) : typeof tooltip === 'string' ? tooltip : undefined

    const ButtonComponent = onChange ? 'button' : 'div'

    return (
        <div
            ref={ref}
            className={clsx(
                'LemonSwitch',
                `LemonSwitch--${size}`,
                checked === true && 'LemonSwitch--checked',
                checked === 'indeterminate' && 'LemonSwitch--indeterminate',
                isActive && 'LemonSwitch--active',
                bordered && 'LemonSwitch--bordered',
                isDisabled && 'LemonSwitch--disabled',
                fullWidth && 'LemonSwitch--full-width',
                loading && 'LemonSwitch--loading',
                className
            )}
            title={tooltipText}
        >
            {label && (
                <label htmlFor={id} className={labelClassName}>
                    {label}
                </label>
            )}
            <ButtonComponent
                id={id}
                className="LemonSwitch__button"
                type={onChange ? 'button' : undefined}
                role="switch"
                aria-checked={checked === 'indeterminate' ? 'mixed' : checked}
                aria-label={ariaLabel}
                onClick={() => {
                    if (onChange && !loading && !isDisabled) {
                        onChange(checked !== true)
                    }
                }}
                onMouseDown={() => !loading && setIsActive(true)}
                onMouseUp={() => setIsActive(false)}
                onMouseOut={() => setIsActive(false)}
                data-attr={dataAttr}
            >
                <div className="LemonSwitch__handle">
                    {loading && <Spinner className="LemonSwitch__spinner-icon" />}
                </div>
            </ButtonComponent>
        </div>
    )
})
