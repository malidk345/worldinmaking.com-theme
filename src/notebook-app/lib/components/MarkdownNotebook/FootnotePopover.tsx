import React, { useEffect, useLayoutEffect, useRef } from 'react'
import { IconCheck, IconTrash, IconX } from '@posthog/icons'
import OSButton from '../../../../components/OSButton'

export interface FootnotePopoverProps {
    id: string
    number?: number | string
    text: string
    top: number
    left: number
    onChangeText: (value: string) => void
    onSave: () => void
    onClose: () => void
    onDelete: () => void
}

function viewBox(): { left: number; top: number; width: number; height: number } {
    const viewport = window.visualViewport
    return {
        left: viewport?.offsetLeft ?? 0,
        top: viewport?.offsetTop ?? 0,
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
    }
}

export function FootnotePopover({
    id,
    number,
    text,
    top,
    left,
    onChangeText,
    onSave,
    onClose,
    onDelete,
}: FootnotePopoverProps): JSX.Element {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const popoverRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.setSelectionRange(
                textareaRef.current.value.length,
                textareaRef.current.value.length
            )
        }
    }, [])

    useLayoutEffect(() => {
        const el = popoverRef.current
        if (!el) return

        const pinToView = (): void => {
            const pad = 8
            const view = viewBox()
            const narrow = view.width < 420
            const maxWidth = Math.max(160, view.width - pad * 2)
            el.style.boxSizing = 'border-box'
            el.style.maxWidth = `${maxWidth}px`
            if (narrow) {
                el.style.width = `${maxWidth}px`
                el.style.left = `${view.left + pad}px`
                el.style.right = 'auto'
                el.style.transform = 'none'
            } else {
                el.style.width = ''
                el.style.transform = 'translate(-50%, 8px)'
            }
            const rect = el.getBoundingClientRect()
            let shiftX = 0
            let shiftY = 0
            if (rect.left < view.left + pad) shiftX += view.left + pad - rect.left
            if (rect.right > view.left + view.width - pad) {
                shiftX += view.left + view.width - pad - rect.right
            }
            if (rect.top < view.top + pad) shiftY += view.top + pad - rect.top
            if (rect.bottom > view.top + view.height - pad) {
                shiftY += view.top + view.height - pad - rect.bottom
            }
            if (narrow) {
                el.style.transform = shiftY ? `translateY(${shiftY}px)` : 'none'
            } else if (shiftX || shiftY) {
                el.style.transform = `translate(calc(-50% + ${shiftX}px), ${8 + shiftY}px)`
            }
        }

        pinToView()
        const viewport = window.visualViewport
        viewport?.addEventListener('resize', pinToView)
        viewport?.addEventListener('scroll', pinToView)
        window.addEventListener('resize', pinToView)
        return () => {
            viewport?.removeEventListener('resize', pinToView)
            viewport?.removeEventListener('scroll', pinToView)
            window.removeEventListener('resize', pinToView)
        }
    }, [top, left, text])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                onClose()
            } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                event.stopPropagation()
                onSave()
            }
        }
        window.addEventListener('keydown', handleKeyDown, true)
        return () => window.removeEventListener('keydown', handleKeyDown, true)
    }, [onClose, onSave])

    return (
        <aside
            ref={popoverRef}
            className="MarkdownNotebook__footnote-popover notebook-topbar-glass"
            style={{ top, left }}
            contentEditable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="MarkdownNotebook__footnote-popover-head flex items-center justify-between gap-2 pb-2 mb-2 border-b border-primary/10">
                <div className="flex items-center gap-1.5 font-medium text-xs text-primary">
                    <span className="inline-flex items-center justify-center size-4 text-[11px] font-bold rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        {number ?? id}
                    </span>
                    <span className="font-semibold tracking-wide">Footnote #{number ?? id}</span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-muted hover:text-primary transition-colors p-1.5 rounded-sm inline-flex items-center justify-center min-w-[28px] min-h-[28px] touch-manipulation"
                    title="Close (Esc)"
                    aria-label="Close"
                >
                    <IconX className="size-3.5" />
                </button>
            </div>

            <textarea
                ref={textareaRef}
                value={text}
                rows={3}
                placeholder="Write footnote text…"
                onChange={(event) => onChangeText(event.target.value)}
                className="notebook-native-field w-full rounded-md border border-primary/15 bg-primary/5 px-2.5 py-2 text-xs text-primary placeholder:text-muted focus:border-blue-500 focus:outline-none transition-colors resize-none"
            />

            <div className="MarkdownNotebook__footnote-popover-actions flex items-center justify-between gap-2 mt-2.5 pt-1">
                <OSButton
                    size="xs"
                    icon={<IconTrash className="size-3.5" />}
                    tooltip="Delete footnote"
                    onClick={onDelete}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                />
                <div className="flex items-center gap-1.5">
                    <OSButton
                        size="xs"
                        variant="primary"
                        icon={<IconCheck className="size-3.5" />}
                        tooltip="Save (Cmd+Enter)"
                        onClick={onSave}
                    >
                        Save
                    </OSButton>
                </div>
            </div>
        </aside>
    )
}
