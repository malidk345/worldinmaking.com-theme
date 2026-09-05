import React, { useState } from 'react'
import { LemonDropdown, LemonInput, LemonDivider, ProfilePicture } from '~nb-lib/lemon-ui/index'
import OSButton from 'components/OSButton'
import { IconNotebook, IconPlus } from '@posthog/icons'
import { getNotebooks } from '../notebookStorage'

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

    const osSize = size === 'medium' ? 'md' : 'sm'
    const osVariant =
        type === 'primary' ? 'primary' : type === 'secondary' ? 'secondary' : 'default'

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
                <OSButton
                    hover="background"
                    zoomHover={false}
                    size="sm"
                    icon={<IconPlus />}
                    onClick={handleCreate}
                    width="full"
                    align="left"
                    variant="default"
                    hover="background"
                >
                    New notebook
                </OSButton>

                <OSButton
                    hover="background"
                    zoomHover={false}
                    size="sm"
                    icon={<IconNotebook />}
                    onClick={() => {
                        const welcome = notebooks.find((n) => n.id === 'welcome-notebook') || notebooks[0]
                        if (welcome) handleSelect(welcome.id)
                    }}
                    width="full"
                    align="left"
                    variant="default"
                    hover="background"
                >
                    My scratchpad
                </OSButton>
            </div>

            <LemonDivider className="my-1" />

            <div className="overflow-y-auto flex-1 space-y-1">
                {filteredNotebooks.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-secondary text-center">
                        No matching notebooks
                    </div>
                ) : (
                    filteredNotebooks.map((nb) => (
                        <OSButton
                    zoomHover={false}
                            key={nb.id}
                            width="full"
                            size="sm"
                            align="left"
                            variant="default"
                            hover="background"
                            onClick={() => handleSelect(nb.id)}
                            icon={
                                <ProfilePicture
                                    user={
                                        nb.isTemplate
                                            ? { first_name: 'WIM' }
                                            : nb.created_by || { first_name: 'You' }
                                    }
                                    size="md"
                                />
                            }
                            iconPosition="right"
                        >
                            <div className="flex flex-col text-left w-full truncate">
                                <span className="truncate text-xs font-medium text-primary">
                                    {nb.title || 'Untitled'}
                                </span>
                                <span className="text-[10px] text-muted truncate">
                                    {nb.isTemplate ? 'WIM' : nb.created_by?.first_name || 'You'} ·{' '}
                                    {new Date(nb.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </OSButton>
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
            <OSButton
                    hover="background"
                    zoomHover={false}
                size={osSize}
                variant={osVariant}
                icon={<IconNotebook />}
                active={isOpen}
                tooltip="Select or search notebook"
            >
                {buttonText || undefined}
            </OSButton>
        </LemonDropdown>
    )
}
