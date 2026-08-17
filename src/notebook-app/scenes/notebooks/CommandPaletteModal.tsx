import { useState, useEffect, useMemo } from 'react'
import { LemonModal, LemonInput, LemonButton } from '~nb-lib/lemon-ui/index'
import { IconSearch, IconSparkles, IconPlus, IconNotebook } from '@posthog/icons'
import { getNotebooks, StoredNotebook } from './notebookStorage'
import { notebookMatchesQuery } from './notebookPreview'

interface CommandPaletteModalProps {
    isOpen: boolean
    onClose: () => void
    onSelectNotebook: (id: string) => void
    onCreateNew: () => void
    onOpenTemplates: () => void
    onOpenAI: () => void
}

export function CommandPaletteModal({
    isOpen,
    onClose,
    onSelectNotebook,
    onCreateNew,
    onOpenTemplates,
    onOpenAI,
}: CommandPaletteModalProps) {
    const [query, setQuery] = useState('')
    const [notebooks, setNotebooks] = useState<StoredNotebook[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
        if (isOpen) {
            setNotebooks(getNotebooks())
            setQuery('')
            setSelectedIndex(0)
        }
    }, [isOpen])

    const filteredNotebooks = useMemo(
        () => notebooks.filter((nb) => notebookMatchesQuery(nb, query)),
        [notebooks, query]
    )

    const actionCount = 3
    const itemCount = actionCount + filteredNotebooks.length

    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    useEffect(() => {
        if (!isOpen) return
        const runSelected = () => {
            if (selectedIndex === 0) {
                onClose()
                onOpenAI()
                return
            }
            if (selectedIndex === 1) {
                onClose()
                onCreateNew()
                return
            }
            if (selectedIndex === 2) {
                onClose()
                onOpenTemplates()
                return
            }
            const notebook = filteredNotebooks[selectedIndex - actionCount]
            if (notebook) {
                onClose()
                onSelectNotebook(notebook.id)
            }
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % Math.max(1, itemCount))
            } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + itemCount) % Math.max(1, itemCount))
            } else if (event.key === 'Enter') {
                event.preventDefault()
                runSelected()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [
        isOpen,
        selectedIndex,
        itemCount,
        filteredNotebooks,
        onClose,
        onOpenAI,
        onCreateNew,
        onOpenTemplates,
        onSelectNotebook,
    ])

    if (!isOpen) return null

    return (
        <LemonModal isOpen={isOpen} onClose={onClose} title="Jump anywhere">
            <div className="space-y-4 p-2">
                <LemonInput
                    type="search"
                    placeholder="Search notebooks or pick an action…"
                    value={query}
                    onChange={setQuery}
                    autoFocus
                    icon={<IconSearch />}
                    className="w-full text-base"
                    aria-label="Search notebooks"
                />

                <div className="space-y-1 max-h-80 overflow-y-auto pt-2">
                    <div className="text-xs font-semibold text-muted px-2 py-1 uppercase tracking-wider">
                        Quick actions
                    </div>

                    <LemonButton
                        type="stealth"
                        fullWidth
                        active={selectedIndex === 0}
                        icon={<IconSparkles className="text-orange-500" />}
                        onMouseEnter={() => setSelectedIndex(0)}
                        onClick={() => {
                            onClose()
                            onOpenAI()
                        }}
                    >
                        <div className="flex justify-between items-center w-full">
                            <span>Ask AI</span>
                            <span className="text-xs text-muted">/ask-ai</span>
                        </div>
                    </LemonButton>

                    <LemonButton
                        type="stealth"
                        fullWidth
                        active={selectedIndex === 1}
                        icon={<IconPlus />}
                        onMouseEnter={() => setSelectedIndex(1)}
                        onClick={() => {
                            onClose()
                            onCreateNew()
                        }}
                    >
                        Create new notebook
                    </LemonButton>

                    <LemonButton
                        type="stealth"
                        fullWidth
                        active={selectedIndex === 2}
                        icon={<IconNotebook />}
                        onMouseEnter={() => setSelectedIndex(2)}
                        onClick={() => {
                            onClose()
                            onOpenTemplates()
                        }}
                    >
                        Browse templates
                    </LemonButton>

                    {filteredNotebooks.length > 0 ? (
                        <>
                            <div className="text-xs font-semibold text-muted px-2 py-1 mt-3 uppercase tracking-wider">
                                Notebooks ({filteredNotebooks.length})
                            </div>
                            {filteredNotebooks.map((nb, index) => (
                                <LemonButton
                                    key={nb.id}
                                    type="stealth"
                                    fullWidth
                                    active={selectedIndex === actionCount + index}
                                    icon={<IconNotebook />}
                                    onMouseEnter={() => setSelectedIndex(actionCount + index)}
                                    onClick={() => {
                                        onClose()
                                        onSelectNotebook(nb.id)
                                    }}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <span className="truncate">{nb.title || 'Untitled'}</span>
                                        <span className="text-xs text-muted ml-2 flex-shrink-0">
                                            {nb.isTemplate ? 'Template' : 'Notebook'}
                                        </span>
                                    </div>
                                </LemonButton>
                            ))}
                        </>
                    ) : query.trim() ? (
                        <p className="text-xs text-muted px-2 py-3 m-0">No notebooks match that search.</p>
                    ) : null}
                </div>
                <div className="flex items-center justify-between px-1 text-[10px] text-muted">
                    <span>↑↓ move · ↵ open</span>
                    <span>esc close</span>
                </div>
            </div>
        </LemonModal>
    )
}
