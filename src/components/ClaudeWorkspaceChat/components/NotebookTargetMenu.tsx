import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { listNotebookAddTargets, NEW_NOTEBOOK_TITLE } from '../../../lib/notebook-add-target'
import { createNotebook, getNotebooks } from '../../../notebook-app/scenes/notebooks/notebookStorage'

type Props = {
    /** The control that was pressed. The menu opens against this element. */
    anchor: HTMLElement | null
    onClose: () => void
    onSelect: (notebookId: string) => void
}

const itemClass =
    'flex h-[25px] w-full cursor-pointer select-none items-center truncate rounded px-2.5 text-left text-[13px] leading-none text-primary outline-none hover:bg-accent'

function placeAgainst(anchor: HTMLElement, panel: HTMLElement): { top: number; left: number } {
    const rect = anchor.getBoundingClientRect()
    const gap = 4
    const margin = 8
    const width = panel.offsetWidth
    const height = panel.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = rect.left
    if (left + width > vw - margin) left = rect.right - width
    left = Math.min(Math.max(margin, left), Math.max(margin, vw - width - margin))
    const spaceBelow = vh - rect.bottom
    const spaceAbove = rect.top
    let top = spaceBelow >= height + gap || spaceBelow >= spaceAbove ? rect.bottom + gap : rect.top - height - gap
    top = Math.min(Math.max(margin, top), Math.max(margin, vh - height - margin))
    return { top, left }
}

/** Same chrome as the menu bar. Opens on the control that was pressed. */
export function NotebookTargetMenu({ anchor, onClose, onSelect }: Props): JSX.Element | null {
    const [creating, setCreating] = useState(false)
    const [title, setTitle] = useState('')
    const [box, setBox] = useState<{ top: number; left: number } | null>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const notebooks = anchor ? listNotebookAddTargets(getNotebooks()) : []

    useEffect(() => {
        if (anchor) return
        setCreating(false)
        setTitle('')
        setBox(null)
    }, [anchor])

    useLayoutEffect(() => {
        const panel = panelRef.current
        if (!anchor || !panel) return
        if (!anchor.isConnected) {
            onClose()
            return
        }
        const next = placeAgainst(anchor, panel)
        setBox((prev) => (prev && prev.top === next.top && prev.left === next.left ? prev : next))
    }, [anchor, creating, notebooks.length, onClose])

    useEffect(() => {
        if (!anchor) return
        const place = () => {
            const panel = panelRef.current
            if (!panel || !anchor.isConnected) return
            const next = placeAgainst(anchor, panel)
            setBox((prev) => (prev && prev.top === next.top && prev.left === next.left ? prev : next))
        }
        const onPointer = (event: MouseEvent) => {
            const node = event.target as Node | null
            if (!node) return
            if (panelRef.current?.contains(node) || anchor.contains(node)) return
            onClose()
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('resize', place)
        window.addEventListener('scroll', place, true)
        document.addEventListener('mousedown', onPointer)
        document.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('resize', place)
            window.removeEventListener('scroll', place, true)
            document.removeEventListener('mousedown', onPointer)
            document.removeEventListener('keydown', onKey)
        }
    }, [anchor, creating, onClose])

    if (!anchor || typeof document === 'undefined') return null

    const chooseNew = (event: React.FormEvent) => {
        event.preventDefault()
        const name = title.trim() || NEW_NOTEBOOK_TITLE
        const made = createNotebook(name, `# ${name}\n`)
        onSelect(made.id)
        onClose()
    }

    return createPortal(
        <div
            ref={panelRef}
            role="menu"
            data-scheme="primary"
            data-testid="notebook-target-menu"
            style={{ top: box?.top ?? -9999, left: box?.left ?? 8, visibility: box ? 'visible' : 'hidden' }}
            className="fixed z-[10050] w-max min-w-[220px] max-w-[280px] rounded-md bg-primary p-[5px] font-sans shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]"
        >
            <div className="max-h-64 overflow-y-auto">
                {notebooks.length === 0 ? (
                    <p className="m-0 flex h-[25px] items-center px-2.5 text-[13px] leading-none text-muted">No notebooks yet</p>
                ) : (
                    notebooks.map((notebook) => (
                        <button
                            key={notebook.id}
                            type="button"
                            role="menuitem"
                            data-testid={`notebook-target-${notebook.id}`}
                            title={notebook.title || 'Notebook'}
                            className={itemClass}
                            onClick={() => {
                                onSelect(notebook.id)
                                onClose()
                            }}
                        >
                            {notebook.title || 'Notebook'}
                        </button>
                    ))
                )}
            </div>
            <div className="m-[5px] h-px bg-border" />
            {creating ? (
                <form onSubmit={chooseNew} className="flex items-center gap-1 px-0.5 pb-0.5">
                    <input
                        autoFocus
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder={NEW_NOTEBOOK_TITLE}
                        aria-label="New notebook title"
                        className="h-[25px] min-w-0 flex-1 rounded bg-input px-2 text-[13px] leading-none text-primary outline-none"
                    />
                    <button
                        type="submit"
                        data-testid="notebook-target-create"
                        className="h-[25px] shrink-0 cursor-pointer rounded px-2 text-[13px] leading-none text-primary hover:bg-accent"
                    >
                        Create
                    </button>
                </form>
            ) : (
                <button
                    type="button"
                    role="menuitem"
                    data-testid="notebook-target-new"
                    className={itemClass}
                    onClick={() => setCreating(true)}
                >
                    New notebook
                </button>
            )}
        </div>,
        document.body
    )
}
