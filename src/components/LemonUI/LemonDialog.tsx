'use client'

import React, { forwardRef, ReactNode, useImperativeHandle, useState } from 'react'
import { LemonButton, LemonButtonProps } from './LemonButton'
import { LemonModal, LemonModalProps } from './LemonModal'

export interface LemonDialogProps extends Pick<
    LemonModalProps,
    'title' | 'description' | 'width' | 'maxWidth' | 'inline' | 'footer' | 'className'
> {
    primaryButton?: LemonButtonProps | null
    secondaryButton?: LemonButtonProps | null
    tertiaryButton?: LemonButtonProps | null
    content?: ((closeDialog: () => void) => ReactNode) | ReactNode
    onClose?: () => void
    onAfterClose?: () => void
    shouldAwaitSubmit?: boolean
    isLoadingCallback?: (isLoading: boolean) => void
    isOpen?: boolean
}

export type LemonDialogRef = {
    closeDialog: () => void
}

export const LemonDialogComponent = forwardRef<LemonDialogRef, LemonDialogProps>(function LemonDialog(
    {
        onAfterClose,
        onClose,
        primaryButton,
        tertiaryButton,
        secondaryButton,
        content,
        shouldAwaitSubmit = false,
        footer,
        isLoadingCallback,
        isOpen: defaultIsOpen = true,
        ...props
    }: LemonDialogProps,
    ref
): JSX.Element {
    const [isOpen, setIsOpen] = useState(defaultIsOpen)
    const [isLoading, setIsLoading] = useState(false)

    useImperativeHandle(
        ref,
        () => ({
            closeDialog: () => setIsOpen(false),
        }),
        []
    )

    const resolvedPrimary = primaryButton === null
        ? null
        : {
              children: 'Okay',
              type: 'primary' as const,
              ...primaryButton,
              disabledReason: shouldAwaitSubmit && isLoading ? 'Please wait...' : primaryButton?.disabledReason,
          }

    const renderButton = (button: LemonButtonProps | null | undefined): JSX.Element | null => {
        if (!button) {
            return null
        }
        const { preventClosing, ...buttonProps } = button as LemonButtonProps & { preventClosing?: boolean }

        return (
            <LemonButton
                type="secondary"
                {...buttonProps}
                loading={button === resolvedPrimary && shouldAwaitSubmit ? isLoading : buttonProps.loading}
                onClick={async (e) => {
                    if (button === resolvedPrimary && shouldAwaitSubmit) {
                        setIsLoading(true)
                        isLoadingCallback?.(true)
                        try {
                            await button.onClick?.(e)
                        } catch (error) {
                            return
                        } finally {
                            setIsLoading(false)
                            isLoadingCallback?.(false)
                        }
                    } else {
                        button.onClick?.(e)
                    }

                    if (!preventClosing) {
                        setIsOpen(false)
                        onClose?.()
                    }
                }}
            />
        )
    }

    const handleClose = (): void => {
        setIsOpen(false)
        onClose?.()
    }

    const resolvedContent = typeof content === 'function' ? content(handleClose) : content

    return (
        <LemonModal
            {...props}
            isOpen={isOpen}
            onClose={handleClose}
            onAfterClose={onAfterClose}
            footer={
                footer ? (
                    footer
                ) : resolvedPrimary || secondaryButton || tertiaryButton ? (
                    <>
                        {tertiaryButton && <div className="flex-1">{renderButton(tertiaryButton)}</div>}
                        {renderButton(secondaryButton)}
                        {renderButton(resolvedPrimary)}
                    </>
                ) : null
            }
        >
            {resolvedContent}
        </LemonModal>
    )
})

export const LemonDialog = LemonDialogComponent
