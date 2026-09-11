import React from 'react'
import clsx from 'clsx'

export interface LemonRadioOption<T extends React.Key> {
    label: string | JSX.Element
    description?: string | JSX.Element
    value: T
    disabledReason?: string
    'data-attr'?: string
    'aria-label'?: string
}

export interface LemonRadioProps<T extends React.Key> {
    value?: T
    onChange: (newValue: T) => void
    options: LemonRadioOption<T>[]
    className?: string
    radioPosition?: 'center' | 'top'
    orientation?: 'vertical' | 'horizontal'
}

export function LemonRadio<T extends React.Key>({
    value: selectedValue,
    onChange,
    options,
    className,
    radioPosition = 'center',
    orientation = 'vertical',
}: LemonRadioProps<T>): JSX.Element {
    return (
        <div
            className={clsx(
                'LemonRadio',
                `LemonRadio--${orientation}`,
                className
            )}
        >
            {options.map(({ value, label, disabledReason, description, ...optionProps }) => {
                return (
                    <label
                        key={value}
                        className={clsx(
                            'LemonRadio__option',
                            `LemonRadio__option--position-${radioPosition}`,
                            disabledReason && 'LemonRadio__option--disabled'
                        )}
                        title={disabledReason}
                    >
                        <input
                            type="radio"
                            className="LemonRadio__input"
                            checked={value === selectedValue}
                            value={String(value)}
                            onChange={() => {
                                if (!disabledReason) {
                                    onChange(value)
                                }
                            }}
                            disabled={!!disabledReason}
                            {...optionProps}
                        />
                        <span className="LemonRadio__label-text">{label}</span>
                        {description && <div className="LemonRadio__description">{description}</div>}
                    </label>
                )
            })}
        </div>
    )
}
