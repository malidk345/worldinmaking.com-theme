import React from 'react'
import clsx from 'clsx'
import { LemonLabel } from './LemonLabel'

export interface LemonPureFieldProps {
    label?: React.ReactNode
    showOptional?: boolean
    onExplanationClick?: () => void
    info?: React.ReactNode
    help?: React.ReactNode
    error?: React.ReactNode
    renderError?: (error: string) => React.ReactNode
    className?: string
    children?: React.ReactNode
    onClick?: () => void
    inline?: boolean
    htmlFor?: string
    labelClassName?: string
}

export const LemonFieldError = ({ error }: { error: string }): JSX.Element => {
    return (
        <div className="LemonField__error">
            {error}
        </div>
    )
}

export const LemonPureField = ({
    label,
    info,
    error,
    help,
    htmlFor,
    showOptional,
    onExplanationClick,
    className,
    children,
    inline,
    onClick,
    renderError,
    labelClassName,
}: LemonPureFieldProps): JSX.Element => {
    return (
        <div
            onClick={onClick}
            className={clsx(
                'LemonField',
                error && 'LemonField--error',
                inline ? 'LemonField--inline' : 'LemonField--column',
                className
            )}
        >
            {label ? (
                <LemonLabel
                    info={info}
                    showOptional={showOptional}
                    onExplanationClick={onExplanationClick}
                    className={clsx(labelClassName, onClick && 'cursor-pointer')}
                    htmlFor={htmlFor}
                >
                    {label}
                </LemonLabel>
            ) : null}
            {children}
            {help ? <div className="LemonField__help">{help}</div> : null}
            {typeof error === 'string' ? (renderError ? renderError(error) : <LemonFieldError error={error} />) : null}
        </div>
    )
}

export interface LemonFieldProps extends LemonPureFieldProps {
    name?: string
}

export const LemonField = (props: LemonFieldProps): JSX.Element => {
    return <LemonPureField {...props} />
}

LemonField.Pure = LemonPureField
LemonField.Error = LemonFieldError
