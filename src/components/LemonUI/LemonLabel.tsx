import React from 'react'
import clsx from 'clsx'
import { IconInfo } from '@posthog/icons'

export interface LemonLabelProps extends Pick<
    React.LabelHTMLAttributes<HTMLLabelElement>,
    'id' | 'htmlFor' | 'form' | 'children' | 'className' | 'onClick'
> {
    info?: React.ReactNode
    infoLink?: string
    showOptional?: boolean
    onExplanationClick?: () => void
    htmlFor?: string
}

export function LemonLabel({
    children,
    info,
    className,
    showOptional,
    onExplanationClick,
    infoLink,
    htmlFor,
    ...props
}: LemonLabelProps): JSX.Element {
    return (
        <label className={clsx('LemonLabel', className)} htmlFor={htmlFor} {...props}>
            {children}

            {showOptional ? <span className="LemonLabel__extra">(optional)</span> : null}

            {onExplanationClick ? (
                <button type="button" onClick={onExplanationClick} className="LemonLabel__explanation">
                    <span className="LemonLabel__extra">(what is this?)</span>
                </button>
            ) : null}

            {info ? (
                <span title={typeof info === 'string' ? info : undefined} className="LemonLabel__info">
                    {infoLink ? (
                        <a href={infoLink} target="_blank" rel="noopener noreferrer" className="LemonLabel__info-link">
                            <IconInfo className="LemonLabel__info-icon" />
                        </a>
                    ) : (
                        <IconInfo className="LemonLabel__info-icon" />
                    )}
                </span>
            ) : null}
        </label>
    )
}
