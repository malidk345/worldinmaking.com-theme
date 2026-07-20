import * as React from 'react'
import { Toast as RadixToast } from 'radix-ui'
import OSButton from 'components/OSButton'
import { IconUndo, IconInfo, IconCheckCircle, IconWarning, IconXCircle } from '@posthog/icons'
import './css/toast.css'

const Toast = ({
    title,
    description,
    type = 'info',
    onUndo,
    onAction,
    actionLabel = 'Undo',
    actionAsIcon,
    className = '',
    duration,
    image,
    verticalAlign = 'items-center',
    onClose,
}: {
    title?: string
    description: string | React.ReactNode
    type?: 'info' | 'success' | 'error' | 'warning'
    onUndo?: () => void
    onAction?: () => void
    actionLabel?: string | React.ReactNode
    actionAsIcon?: React.ReactNode
    className?: string
    duration?: number
    image?: React.ReactNode
    verticalAlign?: string
    onClose?: () => void
}): JSX.Element => {
    const [open, setOpen] = React.useState(true)

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (!isOpen && onClose) {
            // Small delay to allow the closing animation to complete
            setTimeout(() => {
                onClose()
            }, 100)
        }
    }

    const handleAction = () => {
        if (onUndo) {
            onUndo()
        } else if (onAction) {
            onAction()
        }
        handleOpenChange(false)
    }

    const renderIcon = () => {
        switch (type) {
            case 'success':
                return <IconCheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            case 'warning':
                return <IconWarning className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            case 'error':
                return <IconXCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            case 'info':
            default:
                return <IconInfo className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
        }
    }

    return (
        <RadixToast.Root
            data-scheme="primary"
            className={`ToastRoot LemonBanner LemonBanner--${type === 'error' ? 'error' : type} grid grid-cols-[auto_max-content] gap-x-[12px] rounded-md p-3.5 shadow-lg border [grid-template-areas:_'title_action'_'description_action'] data-[swipe=cancel]:translate-x-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=closed]:animate-swipeOut data-[state=open]:animate-slideIn data-[swipe=end]:animate-swipeOut data-[swipe=cancel]:transition-[transform_200ms_ease-out] relative ${verticalAlign ? verticalAlign : 'items-center'
                } ${className}`}
            open={open}
            onOpenChange={handleOpenChange}
            duration={duration || 4000}
        >
            <div className="not-prose flex items-start gap-2">
                {renderIcon()}
                <div>
                    {title && (
                        <RadixToast.Title className="text-[13px] font-bold leading-tight [grid-area:_title] mb-0.5">
                            {title}
                        </RadixToast.Title>
                    )}
                    <RadixToast.Description className="text-xs !my-0 opacity-90">{description}</RadixToast.Description>
                    {image && image}
                </div>
            </div>
            {(onUndo || onAction) && (
                <RadixToast.Action onClick={handleAction} className="[grid-area:_action]" asChild altText={typeof actionLabel === 'string' ? actionLabel : 'Action'}>
                    <OSButton size="sm" icon={onUndo ? <IconUndo /> : undefined}>
                        {actionAsIcon ? actionAsIcon : actionLabel}
                    </OSButton>
                </RadixToast.Action>
            )}
        </RadixToast.Root>
    )
}

export default Toast
