import React, { useCallback, useState } from 'react'
import Modal from 'components/Modal'
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
        <Modal open={isOpen} setOpen={(open: boolean) => { if (!open) onCancel() }}>
            <div className="relative z-10 max-w-md mx-auto mt-32 bg-primary border border-primary rounded p-4 text-primary">
                <h3 className="m-0 text-base font-semibold">{title}</h3>
                {description ? (
                    <p className="text-sm text-secondary m-0 mt-2 leading-relaxed">{description}</p>
                ) : null}
                <div className="flex justify-end gap-2 mt-4">
                    <OSButton size="sm" onClick={onCancel}>
                        {cancelLabel}
                    </OSButton>
                    <OSButton
                        variant="primary"
                        size="sm"
                        className={danger ? 'text-red' : undefined}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </OSButton>
                </div>
            </div>
        </Modal>
    )
}

type PendingConfirm = NotebookConfirmOptions & { resolve: (ok: boolean) => void }

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
