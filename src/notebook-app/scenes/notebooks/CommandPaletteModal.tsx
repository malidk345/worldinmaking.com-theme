import { useState, useEffect } from 'react'
import { LemonModal, LemonInput, LemonButton } from '~nb-lib/lemon-ui/index'
import { IconSearch, IconSparkles, IconPlus, IconNotebook } from '@posthog/icons'
import { getNotebooks, StoredNotebook } from './notebookStorage'

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

    useEffect(() => {
        if (isOpen) {
            setNotebooks(getNotebooks())
        }
    }, [isOpen])

    if (!isOpen) return null

    const filteredNotebooks = notebooks.filter((nb) =>
        nb.title.toLowerCase().includes(query.toLowerCase())
    )

    return (
        <LemonModal isOpen={isOpen} onClose={onClose} title="Command palette (Ctrl + K)">
            <div className="space-y-4 p-2">
                <LemonInput
                    type="search"
                    placeholder="Search notebooks or type a command..."
                    value={query}
                    onChange={setQuery}
                    autoFocus
                    icon={<IconSearch />}
                    className="w-full text-base"
                />

                <div className="space-y-1 max-h-80 overflow-y-auto pt-2">
                    <div className="text-xs font-semibold text-muted px-2 py-1 uppercase tracking-wider">
                        Quick actions
                    </div>

                    <LemonButton
                        type="stealth"
                        fullWidth
                        icon={<IconSparkles className="text-orange-500" />}
                        onClick={() => {
                            onClose()
                            onOpenAI()
                        }}
                    >
                        <div className="flex justify-between items-center w-full">
                            <span>Ask WIM</span>
                            <span className="text-xs text-muted">/ask-ai</span>
                        </div>
                    </LemonButton>

                    <LemonButton
                        type="stealth"
                        fullWidth
                        icon={<IconPlus />}
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
                        icon={<IconNotebook />}
                        onClick={() => {
                            onClose()
                            onOpenTemplates()
                        }}
                    >
                        Browse templates
                    </LemonButton>

                    {filteredNotebooks.length > 0 && (
                        <>
                            <div className="text-xs font-semibold text-muted px-2 py-1 mt-3 uppercase tracking-wider">
                                Notebooks ({filteredNotebooks.length})
                            </div>
                            {filteredNotebooks.map((nb) => (
                                <LemonButton
                                    key={nb.id}
                                    type="stealth"
                                    fullWidth
                                    icon={<IconNotebook />}
                                    onClick={() => {
                                        onClose()
                                        onSelectNotebook(nb.id)
                                    }}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <span className="truncate">{nb.title || 'Untitled Notebook'}</span>
                                        <span className="text-xs text-muted ml-2 flex-shrink-0">
                                            {nb.isTemplate ? 'Template' : 'Notebook'}
                                        </span>
                                    </div>
                                </LemonButton>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </LemonModal>
    )
}
