import React, { forwardRef } from 'react'
import clsx from 'clsx'
import { Spinner } from './Spinner'

export interface LemonRowPropsBase<T extends keyof JSX.IntrinsicElements>
    extends Omit<React.HTMLProps<JSX.IntrinsicElements[T]>, 'ref' | 'size'> {
    icon?: React.ReactElement | null
    tag?: T
    status?: 'default' | 'success' | 'warning' | 'danger' | 'highlighted' | 'muted'
    extendedContent?: React.ReactNode
    loading?: boolean
    tooltip?: any
    fullWidth?: boolean
    center?: boolean
    outlined?: boolean
    size?: 'small' | 'medium' | 'tall' | 'large'
    'data-attr'?: string
}

export interface LemonRowProps<T extends keyof JSX.IntrinsicElements = 'div'> extends LemonRowPropsBase<T> {
    sideIcon?: React.ReactElement | false | null
}

export const LemonRow = forwardRef(function LemonRowInternal<T extends keyof JSX.IntrinsicElements = 'div'>(
    {
        children,
        icon,
        className,
        tag,
        status = 'default',
        extendedContent,
        tooltip,
        sideIcon,
        size = 'medium',
        loading = false,
        fullWidth = false,
        center = false,
        outlined = false,
        disabled = false,
        ...props
    }: LemonRowProps<T>,
    ref: React.Ref<HTMLElement>
): JSX.Element {
    const symbolic = children === null || children === undefined || children === false
    let currentIcon = icon
    if (loading) {
        currentIcon = <Spinner />
    }

    const element = React.createElement(
        tag || 'div',
        {
            className: clsx(
                'LemonRow',
                status && status !== 'default' && `LemonRow--status-${status}`,
                symbolic && 'LemonRow--symbolic',
                fullWidth && 'LemonRow--full-width',
                disabled && 'LemonRow--disabled',
                outlined && 'LemonRow--outlined',
                center && 'LemonRow--center',
                size !== 'medium' && `LemonRow--${size}`,
                className
            ),
            disabled,
            title: typeof tooltip === 'string' ? tooltip : undefined,
            ...props,
            ref,
        },
        <>
            <div className="LemonRow__main-area">
                {currentIcon && <span className="LemonRow__icon">{currentIcon}</span>}
                {!symbolic && <div className="LemonRow__content">{children}</div>}
                {sideIcon && <span className="LemonRow__icon">{sideIcon}</span>}
            </div>
            {extendedContent && <div className="LemonRow__extended-area">{extendedContent}</div>}
        </>
    )

    return element
})
