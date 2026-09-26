import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { listNotebookAddTargets, NEW_NOTEBOOK_TITLE } from '../../../lib/notebook-add-target'
import { createNotebook, getNotebooks } from '../../../notebook-app/scenes/notebooks/notebookStorage'

type Props = {
    anchor: DOMRect | null
    onClose: () => void
    onSelect: (notebookId: string) => void
}

/** Asks which notebook, including a new one. Renders nothing until a button opens it. */
export function NotebookTargetMenu({ anchor, onClose, onSelect }: Props): JSX.Element | null {
    const [creating, setCreating] = useState(false)
    const [title, setTitle] = useState('')
    const panelRef = useRef<HTMLDivElement>(null)
    const notebooks = anchor ? listNotebookAddTargets(getNotebooks()) : []

    useEffect(() => {
        if (!anchor) return
        const onPointer = (event: MouseEvent) => {
            const node = event.target as Node | null
            if (panelRef.current && node && panelRef.current.contains(node)) return
            onClose()
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('mousedown', onPointer)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onPointer)
            document.removeEventListener('keydown', onKey)
        }
    }, [anchor, onClose])

    if (!anchor || typeof document === 'undefined') return null

    const spaceBelow = window.innerHeight - anchor.bottom
    const top = spaceBelow > 240 ? anchor.bottom + 6 : Math.max(8, anchor.top - 248)
    const width = 240
    const left = Math.min(Math.max(8, anchor.right - width), window.innerWidth - width - 8)

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
            data-testid="notebook-target-menu"
            style={{ top, left, width }}
            className="fixed z-[10050] max-h-72 overflow-hidden rounded border border-primary bg-primary text-primary shadow-xl"
        >
            <p className="m-0 px-2.5 pb-1 pt-2 text-[10px] uppercase tracking-wide text-muted">Add to notebook</p>
            <div className="max-h-44 overflow-y-auto">
                {notebooks.length === 0 ? (
                    <p className="m-0 px-2.5 py-1.5 text-xs text-muted">No notebooks yet</p>
                ) : (
                    notebooks.map((notebook) => (
                        <button
                            key={notebook.id}
                            type="button"
                            role="menuitem"
                            data-testid={`notebook-target-${notebook.id}`}
                            className="block w-full cursor-pointer truncate px-2.5 py-1.5 text-left text-xs text-primary hover:bg-accent"
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
            <div className="border-t border-primary p-2">
                {creating ? (
                    <form onSubmit={chooseNew} className="space-y-1.5">
                        <input
                            autoFocus
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder={NEW_NOTEBOOK_TITLE}
                            aria-label="New notebook title"
                            className="w-full rounded border border-primary bg-primary px-2 py-1 text-xs text-primary outline-none"
                        />
                        <div className="flex justify-end gap-1">
                            <button
                                type="button"
                                className="cursor-pointer rounded px-2 py-1 text-xs text-secondary hover:bg-accent"
                                onClick={() => setCreating(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                data-testid="notebook-target-create"
                                className="cursor-pointer rounded border border-primary bg-accent px-2 py-1 text-xs font-medium text-primary"
                            >
                                Create
                            </button>
                        </div>
                    </form>
                ) : (
                    <button
                        type="button"
                        role="menuitem"
                        data-testid="notebook-target-new"
                        className="block w-full cursor-pointer px-1 py-1 text-left text-xs font-medium text-primary hover:bg-accent"
                        onClick={() => setCreating(true)}
                    >
                        New notebook
                    </button>
                )}
            </div>
        </div>,
        document.body
    )
}
