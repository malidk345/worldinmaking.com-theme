import React from 'react'
import clsx from 'clsx'
import { LemonButton, LemonButtonProps } from './LemonButton'

export type LemonSegmentedButtonOption<T extends React.Key> = { value: T } & (
    | { label: string | JSX.Element }
    | { icon: JSX.Element }
) & {
        label?: string | JSX.Element
        icon?: JSX.Element
        disabledReason?: string
        tooltip?: string | JSX.Element
        'data-attr'?: string
    }

export interface LemonSegmentedButtonProps<T extends React.Key> {
    value?: T
    onChange?: (newValue: T, e: React.MouseEvent) => void
    options: LemonSegmentedButtonOption<T>[]
    disabledReason?: string
    size?: LemonButtonProps['size']
    className?: string
    fullWidth?: boolean
}

export function LemonSegmentedButton<T extends React.Key>({
    value,
    onChange,
    options,
    disabledReason,
    size,
    fullWidth,
    className,
}: LemonSegmentedButtonProps<T>): JSX.Element {
    return (
        <div className={clsx('LemonSegmentedButton', fullWidth && 'LemonSegmentedButton--full-width', className)}>
            <ul>
                {options.map((option) => {
                    const optionDisabledReason = option.disabledReason ?? disabledReason
                    const isSelected = option.value === value

                    return (
                        <li
                            key={option.value}
                            className={clsx(
                                'LemonSegmentedButton__option',
                                optionDisabledReason && 'LemonSegmentedButton__option--disabled',
                                isSelected && 'LemonSegmentedButton__option--selected'
                            )}
                        >
                            <LemonButton
                                type={isSelected ? 'primary' : 'secondary'}
                                size={size}
                                fullWidth
                                disabledReason={optionDisabledReason}
                                onClick={(e) => {
                                    if (!optionDisabledReason) {
                                        onChange?.(option.value, e)
                                    }
                                }}
                                icon={option.icon}
                                data-attr={option['data-attr']}
                                title={typeof option.tooltip === 'string' ? option.tooltip : undefined}
                                center
                            >
                                {option.label}
                            </LemonButton>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
