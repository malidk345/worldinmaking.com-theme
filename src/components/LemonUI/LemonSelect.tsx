'use client'

import React, { useMemo } from 'react'
import clsx from 'clsx'
import { IconX } from '@posthog/icons'
import { LemonButton, LemonButtonProps } from './LemonButton'
import { LemonMenu, LemonMenuItem, LemonMenuItemLeaf, LemonMenuSection } from './LemonMenu'

export interface LemonSelectOptionBase {
    icon?: React.ReactElement | null
    sideIcon?: React.ReactElement | null
    disabledReason?: React.ReactNode
    hidden?: boolean
    tooltip?: React.ReactNode
}

export interface LemonSelectOptionLeaf<T> extends LemonSelectOptionBase {
    value: T
    label: string | JSX.Element
    labelInMenu?: string | JSX.Element
}

export interface LemonSelectOptionNode<T> extends LemonSelectOptionBase {
    label: string | JSX.Element
    options: LemonSelectOptions<T>
}

export type LemonSelectOption<T> = LemonSelectOptionLeaf<T> | LemonSelectOptionNode<T>

export interface LemonSelectSection<T> {
    title?: string | React.ReactNode
    options: LemonSelectOption<T>[]
    footer?: string | React.ReactNode
}

export type LemonSelectOptions<T> = LemonSelectSection<T>[] | LemonSelectOption<T>[]

export interface LemonSelectPropsBase<T>
    extends Pick<
        LemonButtonProps,
        | 'id'
        | 'className'
        | 'loading'
        | 'fullWidth'
        | 'disabled'
        | 'disabledReason'
        | 'data-attr'
        | 'aria-label'
        | 'onClick'
        | 'type'
        | 'status'
        | 'active'
        | 'icon'
    > {
    options: LemonSelectOptions<T>
    onSelect?: (newValue: T) => void
    className?: string
    placeholder?: string
    size?: LemonButtonProps['size']
    visible?: boolean
    startVisible?: boolean
}

export interface LemonSelectPropsClearable<T> extends LemonSelectPropsBase<T> {
    allowClear: true
    value?: T | null
    onChange?: (newValue: T | null) => void
}

export interface LemonSelectPropsNonClearable<T> extends LemonSelectPropsBase<T> {
    allowClear?: false
    value?: T
    onChange?: (newValue: T) => void
}

export type LemonSelectProps<T> = LemonSelectPropsClearable<T> | LemonSelectPropsNonClearable<T>

export function LemonSelect<T extends string | number | boolean | null>({
    value = null,
    onChange,
    onSelect,
    options,
    placeholder = 'Select a value',
    allowClear = false,
    className,
    visible,
    startVisible,
    size = 'medium',
    ...buttonProps
}: LemonSelectProps<T>): JSX.Element {
    const [items, allLeafOptions] = useMemo(
        () =>
            convertSelectOptionsToMenuItems(options, value, (newValue) => {
                if (newValue !== value) {
                    onChange?.(newValue as any)
                }
                onSelect?.(newValue)
            }),
        [options, value, onChange, onSelect]
    )

    const activeLeaf = allLeafOptions.find((o) => o.value === value)
    const isClearButtonShown = allowClear && !!value

    return (
        <LemonMenu items={items} visible={visible} startVisible={startVisible} buttonSize={size}>
            <LemonButton
                className={clsx('LemonSelect', className)}
                icon={activeLeaf?.icon || buttonProps.icon}
                type="secondary"
                size={size}
                sideAction={
                    isClearButtonShown
                        ? {
                              icon: <IconX />,
                              onClick: () => {
                                  onChange?.(null as unknown as T)
                              },
                          }
                        : null
                }
                {...buttonProps}
            >
                <span className="LemonSelect__value">
                    {activeLeaf
                        ? activeLeaf.label
                        : value !== null && value !== undefined
                        ? String(value)
                        : placeholder}
                </span>
            </LemonButton>
        </LemonMenu>
    )
}

function convertSelectOptionsToMenuItems<T>(
    options: LemonSelectOptions<T>,
    activeValue: T | null,
    onSelect: (newValue: T) => void
): [(LemonMenuItem | LemonMenuSection)[], LemonSelectOptionLeaf<T>[]] {
    const leafOptionsAccumulator: LemonSelectOptionLeaf<T>[] = []
    const items = options
        .map((option) => convertToMenuSingle(option, activeValue, onSelect, leafOptionsAccumulator))
        .filter(Boolean) as (LemonMenuItem | LemonMenuSection)[]
    return [items, leafOptionsAccumulator]
}

function convertToMenuSingle<T>(
    option: LemonSelectOption<T> | LemonSelectSection<T>,
    activeValue: T | null,
    onSelect: (newValue: T) => void,
    acc: LemonSelectOptionLeaf<T>[]
): LemonMenuItem | LemonMenuSection | null {
    if ('options' in option && !('label' in option)) {
        const { options: childOptions, ...section } = option as LemonSelectSection<T>
        const items = childOptions.map((o) => convertToMenuSingle(o, activeValue, onSelect, acc)).filter(Boolean)
        return {
            ...section,
            items,
        } as LemonMenuSection
    }
    const leaf = option as LemonSelectOptionLeaf<T>
    acc.push(leaf)
    if (leaf.hidden) {
        return null
    }
    return {
        label: leaf.labelInMenu || leaf.label,
        icon: leaf.icon,
        sideIcon: leaf.sideIcon,
        disabledReason: leaf.disabledReason,
        active: leaf.value === activeValue,
        onClick: () => onSelect(leaf.value),
    } as LemonMenuItemLeaf
}
