import React, { useEffect, useState } from 'react'

function isCoarsePointer(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

function run(command: string, value?: string): void {
    try {
        document.execCommand(command, false, value)
    } catch {
        /* unsupported command */
    }
}

export function MobileFormatDock(): JSX.Element | null {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!isCoarsePointer()) return
        const sync = () => {
            const active = document.activeElement
            const inNotebook =
                active instanceof HTMLElement &&
                active.isContentEditable &&
                Boolean(active.closest('.MarkdownNotebook, [data-markdown-notebook-editor]'))
            const keyboardOpen = document.documentElement.getAttribute('data-keyboard') === 'open'
            setVisible(inNotebook && keyboardOpen)
        }
        sync()
        document.addEventListener('focusin', sync)
        document.addEventListener('focusout', sync)
        const observer = new MutationObserver(sync)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-keyboard'] })
        return () => {
            document.removeEventListener('focusin', sync)
            document.removeEventListener('focusout', sync)
            observer.disconnect()
        }
    }, [])

    if (!visible) return null

    return (
        <div className="notebook-mobile-format-dock" contentEditable={false}>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('bold')} aria-label="Bold">
                B
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('italic')} aria-label="Italic">
                I
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('underline')} aria-label="Underline">
                U
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('formatBlock', 'h2')} aria-label="Heading">
                H
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('insertUnorderedList')} aria-label="List">
                •
            </button>
        </div>
    )
}
