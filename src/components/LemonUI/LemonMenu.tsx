'use client'

import React, { cloneElement, forwardRef, useMemo } from 'react'
import clsx from 'clsx'
import { LemonButton, LemonButtonProps } from './LemonButton'
import { LemonDivider } from './LemonDivider'
import { LemonDropdown, LemonDropdownProps } from './LemonDropdown'
import { LemonTag } from './LemonTag'

export interface LemonMenuItemBase
    extends Pick<
        LemonButtonProps,
        'icon' | 'sideIcon' | 'sideAction' | 'disabledReason' | 'active' | 'status' | 'data-attr' | 'size'
    > {
    label: string | JSX.Element
    key?: React.Key
    className?: string
    custom?: boolean
    tooltip?: React.ReactNode
}

export interface LemonMenuItemNode extends LemonMenuItemBase {
    items: (LemonMenuItem | false | null)[]
    placement?: LemonDropdownProps['placement']
}

export interface LemonMenuItemLeafCallback extends LemonMenuItemBase {
    onClick?: (e: React.MouseEvent) => void
    to?: string
    targetBlank?: boolean
    items?: never
}

export type LemonMenuItemLeaf = LemonMenuItemLeafCallback

export interface LemonMenuItemCustom {
    label: () => JSX.Element
    key?: React.Key
    active?: never
    items?: never
    custom?: boolean
}

export type LemonMenuItem = (LemonMenuItemLeaf | LemonMenuItemCustom | LemonMenuItemNode) & {
    tag?: 'alpha' | 'beta' | 'new'
}

export interface LemonMenuSection {
    title?: string | React.ReactNode
    key?: React.Key
    items: (LemonMenuItem | false | null)[]
    footer?: string | React.ReactNode
}

export type LemonMenuItems = (LemonMenuItem | LemonMenuSection | false | null)[]

export interface LemonMenuProps extends Omit<LemonDropdownProps, 'overlay' | 'children'> {
    items: LemonMenuItems
    children: React.ReactElement
    buttonSize?: 'xsmall' | 'small' | 'medium'
}

export const LemonMenu = forwardRef<HTMLElement, LemonMenuProps>(function LemonMenu(
    { items, buttonSize = 'small', children, ...dropdownProps },
    ref
): JSX.Element {
    return (
        <LemonDropdown
            overlay={<LemonMenuOverlay items={items} buttonSize={buttonSize} />}
            closeOnClickInside
            {...dropdownProps}
        >
            {cloneElement(children, { ref })}
        </LemonDropdown>
    )
})

export interface LemonMenuOverlayProps {
    items: LemonMenuItems
    buttonSize?: 'xsmall' | 'small' | 'medium'
}

export function LemonMenuOverlay({ items, buttonSize = 'small' }: LemonMenuOverlayProps): JSX.Element {
    const sectionsOrItems = useMemo(() => normalizeItems(items), [items])

    return (
        <div className="LemonMenu">
            {sectionsOrItems.length > 0 && isLemonMenuSection(sectionsOrItems[0]) ? (
                <LemonMenuSectionList sections={sectionsOrItems as LemonMenuSection[]} buttonSize={buttonSize} />
            ) : (
                <LemonMenuItemList items={sectionsOrItems as LemonMenuItem[]} buttonSize={buttonSize} />
            )}
        </div>
    )
}

function LemonMenuSectionList({
    sections,
    buttonSize,
}: {
    sections: LemonMenuSection[]
    buttonSize: 'xsmall' | 'small' | 'medium'
}): JSX.Element {
    return (
        <div className="LemonMenu__sections">
            {sections.map((section, i) => (
                <div key={section.key || i} className="LemonMenu__section">
                    {section.title && (
                        <div className="LemonMenu__section-title">
                            {typeof section.title === 'string' ? <h5>{section.title}</h5> : section.title}
                        </div>
                    )}
                    <LemonMenuItemList
                        items={section.items.filter(Boolean) as LemonMenuItem[]}
                        buttonSize={buttonSize}
                    />
                    {section.footer && <div className="LemonMenu__section-footer">{section.footer}</div>}
                    {i < sections.length - 1 && <LemonDivider />}
                </div>
            ))}
        </div>
    )
}

function LemonMenuItemList({
    items,
    buttonSize = 'small',
}: {
    items: LemonMenuItem[]
    buttonSize?: 'xsmall' | 'small' | 'medium'
}): JSX.Element {
    return (
        <div className="LemonMenu__items">
            {items.map((item, index) => (
                <LemonMenuItemButton key={item.key || index} item={item} size={buttonSize} />
            ))}
        </div>
    )
}

function LemonMenuItemButton({
    item,
    size,
}: {
    item: LemonMenuItem
    size: 'xsmall' | 'small' | 'medium'
}): JSX.Element {
    const { label, items, tag, custom, ...buttonProps } = item

    if (typeof label === 'function') {
        const CustomLabel = label
        return <CustomLabel />
    }

    const button = (
        <LemonButton
            fullWidth
            size={size}
            type="tertiary"
            to={(item as LemonMenuItemLeafCallback).to}
            targetBlank={(item as LemonMenuItemLeafCallback).targetBlank}
            {...buttonProps}
        >
            <span>{label}</span>
            {tag && (
                <LemonTag type={tag === 'alpha' ? 'completion' : tag === 'beta' ? 'warning' : 'success'} size="small">
                    {tag.toUpperCase()}
                </LemonTag>
            )}
        </LemonButton>
    )

    if (items) {
        return (
            <LemonMenu items={items} placement="right-start" buttonSize={size}>
                {button}
            </LemonMenu>
        )
    }

    return button
}

function normalizeItems(sectionsAndItems: LemonMenuItems): LemonMenuItem[] | LemonMenuSection[] {
    const sections: LemonMenuSection[] = []
    let implicitSection: LemonMenuSection = { items: [] }
    for (const sectionOrItem of sectionsAndItems) {
        if (!sectionOrItem) continue
        if (isLemonMenuSection(sectionOrItem)) {
            if (implicitSection.items.length > 0) {
                sections.push(implicitSection)
                implicitSection = { items: [] }
            }
            sections.push(sectionOrItem)
        } else {
            implicitSection.items.push(sectionOrItem)
        }
    }
    if (implicitSection.items.length > 0) {
        sections.push(implicitSection)
    }

    if (sections.length === 1 && !sections[0].title && !sections[0].footer) {
        return sections[0].items.filter(Boolean) as LemonMenuItem[]
    }
    return sections
}

export function isLemonMenuSection(candidate: LemonMenuSection | LemonMenuItem): candidate is LemonMenuSection {
    return candidate && 'items' in candidate && !('label' in candidate)
}
