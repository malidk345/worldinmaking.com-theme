import React, { useState } from 'react'
import { LemonButton, LemonDropdown, LemonInput, LemonDivider, LemonTag, ProfilePicture } from '~nb-lib/lemon-ui/index'
import { IconNotebook, IconPlus } from '@posthog/icons'
import { StoredNotebook, getNotebooks, createNotebook } from '../notebookStorage'

export interface NotebookSelectButtonProps {
    onSelectNotebook: (id: string) => void
    onCreateNew: () => void
    buttonText?: string
    size?: 'small' | 'medium'
    type?: 'primary' | 'secondary' | 'stealth'
}

export function NotebookSelectButton({
    onSelectNotebook,
    onCreateNew,
    buttonText = 'Notebooks',
    size = 'small',
    type = 'secondary',
}: NotebookSelectButtonProps): JSX.Element {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const notebooks = getNotebooks()

    const filteredNotebooks = notebooks.filter((nb) =>
        nb.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleSelect = (id: string) => {
        setIsOpen(false)
        onSelectNotebook(id)
    }

    const handleCreate = () => {
        setIsOpen(false)
        onCreateNew()
    }

    const popoverContent = (
        <div className="w-72 p-2 flex flex-col gap-2 max-h-96">
            <LemonInput
                type="search"
                placeholder="Filter notebooks..."
                value={searchQuery}
                onChange={setSearchQuery}
                size="small"
                fullWidth
                autoFocus
            />

            <div className="flex flex-col gap-1">
                <LemonButton
                    size="small"
                    icon={<IconPlus />}
                    onClick={handleCreate}
                    fullWidth
                    type="tertiary"
                >
                    New notebook
                </LemonButton>

                <LemonButton
                    size="small"
                    icon={<IconNotebook />}
                    onClick={() => {
                        const welcome = notebooks.find((n) => n.id === 'welcome-notebook') || notebooks[0]
                        if (welcome) handleSelect(welcome.id)
                    }}
                    fullWidth
                    type="tertiary"
                >
                    My scratchpad
                </LemonButton>
            </div>

            <LemonDivider className="my-1" />

            <div className="overflow-y-auto flex-1 space-y-1">
                {filteredNotebooks.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-secondary text-center">
                        No matching notebooks
                    </div>
                ) : (
                    filteredNotebooks.map((nb) => (
                        <LemonButton
                            key={nb.id}
                            fullWidth
                            size="small"
                            type="stealth"
                            onClick={() => handleSelect(nb.id)}
                            sideIcon={
                                <ProfilePicture
                                    user={nb.isTemplate ? { first_name: 'WIM' } : nb.created_by || { first_name: 'You' }}
                                    size="md"
                                />
                            }
                        >
                            <div className="flex flex-col text-left w-full truncate">
                                <span className="truncate text-xs font-medium text-primary">
                                    {nb.title || 'Untitled'}
                                </span>
                                <span className="text-[10px] text-muted truncate">
                                    {nb.isTemplate ? 'WIM' : (nb.created_by?.first_name || 'You')} · {new Date(nb.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </LemonButton>
                    ))
                )}
            </div>
        </div>
    )

    return (
        <LemonDropdown
            overlay={popoverContent}
            visible={isOpen}
            onVisibilityChange={setIsOpen}
            closeOnClickInside={false}
        >
            <LemonButton
                size={size}
                type={type}
                icon={<IconNotebook />}
                active={isOpen}
                tooltip="Select or search notebook"
            >
                {buttonText || undefined}
            </LemonButton>
        </LemonDropdown>
    )
}
