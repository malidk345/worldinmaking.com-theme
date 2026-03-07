"use client"

import * as React from 'react'
import OSButton from 'components/OSButton'

export type ToolbarElement =
    | { type: 'separator'; className?: string }
    | {
        type: 'button'
        label: string
        onClick?: () => void
        disabled?: boolean
        className?: string
        icon?: React.ReactNode
        hideLabel?: boolean
        variant?: 'default' | 'primary' | 'secondary' | 'underline' | 'underlineOnHover' | 'ghost'
        size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
        active?: boolean
    }
    | {
        type: 'container'
        className?: string
        children: React.ReactNode
    }

interface ToolbarProps {
    elements: ToolbarElement[]
    className?: string
    'aria-label'?: string
}

export const Toolbar = ({ elements, className, 'aria-label': ariaLabel }: ToolbarProps) => {
    return (
        <div
            role="toolbar"
            aria-label={ariaLabel}
            className={`flex w-full items-center min-w-0 rounded border border-primary bg-primary p-1 ${className || ''}`}
        >
            {elements.map((element, index) => {
                if (element.type === 'separator') {
                    return (
                        <div
                            key={index}
                            className={`mx-2 w-px self-stretch bg-border my-0.5 ${element.className || ''}`}
                        />
                    )
                }

                if (element.type === 'button') {
                    return (
                        <OSButton
                            key={index}
                            onClick={() => !element.disabled && element.onClick?.()}
                            variant={element.variant || 'default'}
                            size={element.size || 'md'}
                            icon={element.icon}
                            active={element.active}
                            className={`${element.className || ''} !px-[5px] ${element.active ? '!bg-accent-2 hover:!bg-accent-2 text-primary' : ''}`}
                            disabled={element.disabled}
                        >
                            {!element.hideLabel && element.label}
                        </OSButton>
                    )
                }

                if (element.type === 'container') {
                    return (
                        <div key={index} className={element.className}>
                            {element.children}
                        </div>
                    )
                }

                return null
            })}
        </div>
    )
}

export default Toolbar
