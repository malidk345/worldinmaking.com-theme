'use client'

import React, { ReactNode, useMemo, useState } from 'react'
import clsx from 'clsx'
import { IconCollapse, IconExpand } from '@posthog/icons'
import { LemonButton, LemonButtonProps } from './LemonButton'

export interface LemonCollapsePanel<K extends React.Key> {
    key: K
    header: ReactNode | LemonButtonProps
    content: ReactNode
    dataAttr?: string
    className?: string
}

interface LemonCollapsePropsBase<K extends React.Key> {
    panels: (LemonCollapsePanel<K> | null | false)[]
    className?: string
    size?: LemonButtonProps['size']
    embedded?: boolean
}

interface LemonCollapsePropsSingle<K extends React.Key> extends LemonCollapsePropsBase<K> {
    activeKey?: K
    defaultActiveKey?: K
    onChange?: (activeKey: K | null) => void
    multiple?: false
}

interface LemonCollapsePropsMultiple<K extends React.Key> extends LemonCollapsePropsBase<K> {
    activeKeys?: K[]
    defaultActiveKeys?: K[]
    onChange?: (activeKeys: K[]) => void
    multiple: true
}

export type LemonCollapseProps<K extends React.Key> = LemonCollapsePropsSingle<K> | LemonCollapsePropsMultiple<K>

export function LemonCollapse<K extends React.Key>({
    panels,
    className,
    size,
    embedded,
    ...props
}: LemonCollapseProps<K>): JSX.Element {
    const isMultiple = props.multiple === true
    const [localActiveKey, setLocalActiveKey] = useState<K | null>(
        !isMultiple ? ((props as LemonCollapsePropsSingle<K>).defaultActiveKey ?? null) : null
    )
    const [localActiveKeys, setLocalActiveKeys] = useState<Set<K>>(
        new Set(isMultiple ? ((props as LemonCollapsePropsMultiple<K>).defaultActiveKeys ?? []) : [])
    )

    let isPanelExpanded: (key: K) => boolean
    let onPanelChange: (key: K, isExpanded: boolean) => void

    if (isMultiple) {
        const effectiveActiveKeys = (props as LemonCollapsePropsMultiple<K>).activeKeys
            ? new Set((props as LemonCollapsePropsMultiple<K>).activeKeys)
            : localActiveKeys

        isPanelExpanded = (key: K) => effectiveActiveKeys.has(key)
        onPanelChange = (key: K, isExpanded: boolean): void => {
            const newActiveKeys = new Set(effectiveActiveKeys)
            if (isExpanded) {
                newActiveKeys.add(key)
            } else {
                newActiveKeys.delete(key)
            }
            ;(props as LemonCollapsePropsMultiple<K>).onChange?.(Array.from(newActiveKeys))
            setLocalActiveKeys(newActiveKeys)
        }
    } else {
        const effectiveActiveKey = (props as LemonCollapsePropsSingle<K>).activeKey ?? localActiveKey
        isPanelExpanded = (key: K) => key === effectiveActiveKey
        onPanelChange = (key: K, isExpanded: boolean): void => {
            ;(props as LemonCollapsePropsSingle<K>).onChange?.(isExpanded ? key : null)
            setLocalActiveKey(isExpanded ? key : null)
        }
    }

    const displayPanels = panels.filter(Boolean) as LemonCollapsePanel<K>[]

    return (
        <div className={clsx('LemonCollapse', embedded && 'LemonCollapse--embedded', className)}>
            {displayPanels.map(({ key, ...panel }) => (
                <LemonCollapsePanelComponent
                    key={key}
                    {...panel}
                    size={size}
                    isExpanded={isPanelExpanded(key)}
                    onChange={(isExpanded) => onPanelChange(key, isExpanded)}
                />
            ))}
        </div>
    )
}

interface LemonCollapsePanelProps {
    header: ReactNode | LemonButtonProps
    content: ReactNode
    isExpanded: boolean
    size?: LemonButtonProps['size']
    onChange: (isExpanded: boolean) => void
    className?: string
    dataAttr?: string
}

function LemonCollapsePanelComponent({
    header,
    content,
    isExpanded,
    size,
    className,
    dataAttr,
    onChange,
}: LemonCollapsePanelProps): JSX.Element {
    const { headerChildren, headerProps } = useMemo(() => {
        if (header && typeof header === 'object' && 'children' in header) {
            const { children, ...rest } = header as LemonButtonProps
            return { headerChildren: children, headerProps: rest }
        }
        return { headerChildren: header as ReactNode, headerProps: {} }
    }, [header])

    return (
        <div className="LemonCollapsePanel" aria-expanded={isExpanded}>
            {content ? (
                <LemonButton
                    {...headerProps}
                    fullWidth
                    className={clsx('LemonCollapsePanel__header', headerProps?.className)}
                    onClick={(e) => {
                        onChange(!isExpanded)
                        headerProps.onClick?.(e)
                        e.stopPropagation()
                    }}
                    icon={isExpanded ? <IconCollapse /> : <IconExpand />}
                    size={size}
                    {...(dataAttr ? { 'data-attr': dataAttr } : {})}
                >
                    {headerChildren}
                </LemonButton>
            ) : (
                <LemonButton
                    className="LemonCollapsePanel__header LemonCollapsePanel__header--disabled"
                    size={size}
                    {...(dataAttr ? { 'data-attr': dataAttr } : {})}
                >
                    {headerChildren}
                </LemonButton>
            )}

            {isExpanded && (
                <div className="LemonCollapsePanel__body">
                    <div className={clsx('LemonCollapsePanel__content', className)}>{content}</div>
                </div>
            )}
        </div>
    )
}

LemonCollapse.Panel = LemonCollapsePanelComponent
