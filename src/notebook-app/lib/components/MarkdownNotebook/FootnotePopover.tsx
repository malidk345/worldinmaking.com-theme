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
            const pad = 10
            const view = viewBox()
            const isNarrow = view.width <= 640 || (typeof window !== 'undefined' && window.innerWidth <= 640)

            const rect = el.getBoundingClientRect()
            const height = rect.height || 180

            if (isNarrow) {
                // On mobile, horizontal positioning is anchored via CSS (left: 10px, right: 10px).
                // Ensure vertical visibility within active visual viewport (above keyboard, below header).
                const minTop = view.top + pad
                const maxTop = Math.max(minTop, view.top + view.height - height - pad)

                let targetTop = top
                if (targetTop > maxTop) {
                    targetTop = maxTop
                }
                if (targetTop < minTop) {
                    targetTop = minTop
                }
                el.style.top = `${Math.round(targetTop)}px`
                el.style.bottom = 'auto'
                el.style.transform = 'none'
                return
            }

            // Desktop / wide screen positioning
            el.style.width = ''
            el.style.maxWidth = '320px'
            el.style.top = `${top}px`
            el.style.left = `${left}px`

            let shiftX = 0
            let shiftY = 0
            const updatedRect = el.getBoundingClientRect()
            if (updatedRect.left < view.left + pad) {
                shiftX += view.left + pad - updatedRect.left
            }
            if (updatedRect.right > view.left + view.width - pad) {
                shiftX += view.left + view.width - pad - updatedRect.right
            }
            if (updatedRect.top < view.top + pad) {
                shiftY += view.top + pad - updatedRect.top
            }
            if (updatedRect.bottom > view.top + view.height - pad) {
                shiftY += view.top + view.height - pad - updatedRect.bottom
            }
            el.style.transform = `translate(calc(-50% + ${shiftX}px), ${8 + shiftY}px)`
        }

        pinToView()
        const timer1 = setTimeout(pinToView, 60)
        const timer2 = setTimeout(pinToView, 250)

        const viewport = window.visualViewport
        viewport?.addEventListener('resize', pinToView)
        viewport?.addEventListener('scroll', pinToView)
        window.addEventListener('resize', pinToView)
        window.addEventListener('scroll', pinToView)
        return () => {
            clearTimeout(timer1)
            clearTimeout(timer2)
            viewport?.removeEventListener('resize', pinToView)
            viewport?.removeEventListener('scroll', pinToView)
            window.removeEventListener('resize', pinToView)
            window.removeEventListener('scroll', pinToView)
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
                    <span className="inline-flex items-center justify-center size-4 text-[11px] font-bold rounded bg-primary/10 text-primary">
                        {number ?? id}
                    </span>
                    <span className="font-semibold tracking-wide">Footnote #{number ?? id}</span>
                </div>
                <OSButton
                    size="xs"
                    icon={<IconX className="size-3.5" />}
                    tooltip="Close (Esc)"
                    onClick={onClose}
                />
            </div>

            <textarea
                ref={textareaRef}
                value={text}
                rows={3}
                placeholder="Write footnote text…"
                onChange={(event) => onChangeText(event.target.value)}
                className="notebook-native-field w-full rounded-md border border-primary/15 bg-primary/5 px-2.5 py-2 text-[16px] sm:text-xs text-primary placeholder:text-muted focus:border-blue-500 focus:outline-none transition-colors resize-none touch-manipulation"
            />

            <div className="MarkdownNotebook__footnote-popover-actions flex items-center justify-between gap-2 mt-2.5 pt-1">
                <OSButton
                    size="sm"
                    icon={<IconTrash className="size-3.5" />}
                    tooltip="Delete footnote"
                    onClick={onDelete}
                    className="text-red-500"
                />
                <div className="flex items-center gap-1.5">
                    <OSButton
                        size="sm"
                        onClick={onClose}
                    >
                        Cancel
                    </OSButton>
                    <OSButton
                        variant="primary"
                        size="sm"
                        icon={<IconCheck className="size-3.5" />}
                        onClick={onSave}
                    >
                        Save
                    </OSButton>
                </div>
            </div>
        </aside>
    )
}
