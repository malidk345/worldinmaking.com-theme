import React, { useCallback, useState } from 'react'
import { LemonModal } from '~nb-lib/lemon-ui/index'
import OSButton from 'components/OSButton'

export interface NotebookConfirmOptions {
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
}

interface NotebookConfirmDialogProps extends NotebookConfirmOptions {
    isOpen: boolean
    onConfirm: () => void
    onCancel: () => void
}

/** Site-chrome confirm (LemonModal). Replaces window.confirm in the notebook app. */
export function NotebookConfirmDialog({
    isOpen,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger,
    onConfirm,
    onCancel,
}: NotebookConfirmDialogProps): JSX.Element {
    return (
        <LemonModal isOpen={isOpen} onClose={onCancel} title={title} width={420}>
            <div className="space-y-4">
                {description ? <p className="text-sm text-secondary m-0 leading-relaxed">{description}</p> : null}
                <div className="flex justify-end gap-2">
                    <OSButton variant="secondary" size="sm" onClick={onCancel}>
                        {cancelLabel}
                    </OSButton>
                    <OSButton variant="primary" size="sm" className={danger ? 'text-danger' : undefined} onClick={onConfirm}>
                        {confirmLabel}
                    </OSButton>
                </div>
            </div>
        </LemonModal>
    )
}

type PendingConfirm = NotebookConfirmOptions & { resolve: (ok: boolean) => void }

/** Promise-based confirm for list / history / editor delete. */
export function useNotebookConfirm(): {
    confirm: (options: NotebookConfirmOptions) => Promise<boolean>
    dialog: JSX.Element
} {
    const [pending, setPending] = useState<PendingConfirm | null>(null)

    const confirm = useCallback((options: NotebookConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setPending({ ...options, resolve })
        })
    }, [])

    const close = useCallback(
        (ok: boolean) => {
            pending?.resolve(ok)
            setPending(null)
        },
        [pending]
    )

    const dialog = (
        <NotebookConfirmDialog
            isOpen={Boolean(pending)}
            title={pending?.title || ''}
            description={pending?.description}
            confirmLabel={pending?.confirmLabel}
            cancelLabel={pending?.cancelLabel}
            danger={pending?.danger}
            onConfirm={() => close(true)}
            onCancel={() => close(false)}
        />
    )

    return { confirm, dialog }
}
