import React from 'react'
import clsx from 'clsx'
import { IconCheckCircle, IconInfo } from '@posthog/icons'

export interface AbstractLemonTab<T extends string | number> {
    key: T
    label: string | JSX.Element
    tooltip?: string | JSX.Element
    disabledReason?: string
    link?: string
    completed?: boolean
    'data-attr'?: string
}

export interface ConcreteLemonTab<T extends string | number> extends AbstractLemonTab<T> {
    content: JSX.Element
}

export type LemonTab<T extends string | number> = AbstractLemonTab<T> | ConcreteLemonTab<T>

export interface LemonTabsProps<T extends string | number> {
    activeKey: T
    onChange?: (key: T) => void
    tabs: (LemonTab<T> | null | false)[]
    size?: 'xsmall' | 'small' | 'medium'
    'data-attr'?: string
    barClassName?: string
    className?: string
    sceneInset?: boolean
    rightSlot?: React.ReactNode
    rightSlotClassName?: string
}

export function LemonTabs<T extends string | number>({
    activeKey,
    onChange,
    tabs,
    barClassName,
    size = 'medium',
    className,
    'data-attr': dataAttr,
    sceneInset = false,
    rightSlot,
    rightSlotClassName,
}: LemonTabsProps<T>): JSX.Element {
    const realTabs = tabs.filter(Boolean) as LemonTab<T>[]
    const activeTab = realTabs.find((tab) => tab.key === activeKey)

    return (
        <div
            className={clsx(
                'LemonTabs',
                `LemonTabs--${size}`,
                sceneInset && 'LemonTabs--sceneInset',
                className
            )}
            data-attr={dataAttr}
        >
            <ul className={clsx('LemonTabs__bar', barClassName)} role="tablist">
                <div className="LemonTabs__tab-container">
                    {realTabs.map((tab) => {
                        const disabled = !!tab.disabledReason
                        const isSelected = tab.key === activeKey
                        const titleText = tab.disabledReason || (typeof tab.tooltip === 'string' ? tab.tooltip : undefined)

                        const content = (
                            <div className="LemonTabs__tab-label" data-attr={tab['data-attr']}>
                                {tab.label}
                                {tab.completed && <IconCheckCircle className="LemonTabs__icon LemonTabs__icon--success" />}
                                {tab.tooltip && <IconInfo className="LemonTabs__icon" />}
                            </div>
                        )

                        return (
                            <li
                                key={String(tab.key)}
                                className={clsx(
                                    'LemonTabs__tab',
                                    isSelected && 'LemonTabs__tab--active',
                                    disabled && 'LemonTabs__tab--disabled'
                                )}
                                onClick={onChange && !disabled ? () => onChange(tab.key) : undefined}
                                role="tab"
                                aria-selected={isSelected}
                                aria-disabled={disabled || undefined}
                                title={titleText}
                            >
                                {tab.link ? (
                                    <a href={tab.link} className="LemonTabs__tab-content">
                                        {content}
                                    </a>
                                ) : (
                                    <div className="LemonTabs__tab-content">{content}</div>
                                )}
                            </li>
                        )
                    })}
                </div>
                {rightSlot && <div className={clsx('LemonTabs__right-slot', rightSlotClassName)}>{rightSlot}</div>}
            </ul>
            {activeTab && 'content' in activeTab && (
                <div className={clsx('LemonTabs__content', sceneInset && 'LemonTabs__content--sceneInset')}>
                    {activeTab.content}
                </div>
            )}
        </div>
    )
}
