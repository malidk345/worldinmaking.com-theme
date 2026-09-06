import React from 'react'
import { IconGlobe, IconPeople } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { Popover } from 'components/RadixUI/Popover'
import {
    NotebookInvitePanel,
    NotebookPublishPanel,
    type NotebookPublishPayload,
    type NotebookShareTab,
} from './NotebookShareModal'

export type NotebookSharePanel = NotebookShareTab

interface SidebarContextPanelMenuProps {
    notebookId: string
    notebookTitle: string
    onPublish: (meta: NotebookPublishPayload) => void
    panel?: NotebookSharePanel | null
    onPanelChange?: (panel: NotebookSharePanel | null) => void
}

const PANEL_CLASS =
    'w-[min(18rem,calc(100vw-1.5rem))] max-h-[min(28rem,70dvh)] overflow-y-auto z-[80]'

export function SidebarContextPanelMenu({
    notebookId,
    notebookTitle,
    onPublish,
    panel = null,
    onPanelChange,
}: SidebarContextPanelMenuProps) {
    const inviteOpen = panel === 'private'
    const publishOpen = panel === 'publish'

    return (
        <>
            <Popover
                header
                title="Invite members"
                dataScheme="secondary"
                side="bottom"
                align="end"
                sideOffset={8}
                open={inviteOpen}
                onOpenChange={(open) => {
                    if (open) onPanelChange?.('private')
                    else if (inviteOpen) onPanelChange?.(null)
                }}
                contentClassName={PANEL_CLASS}
                trigger={
                    <span>
                        <OSButton
                            icon={<IconPeople />}
                            size="md"
                            tooltip="Invite members"
                            active={inviteOpen}
                        />
                    </span>
                }
            >
                <NotebookInvitePanel notebookId={notebookId} isOpen={inviteOpen} />
            </Popover>
            <Popover
                header
                title="Publish on WIM"
                dataScheme="secondary"
                side="bottom"
                align="end"
                sideOffset={8}
                open={publishOpen}
                onOpenChange={(open) => {
                    if (open) onPanelChange?.('publish')
                    else if (publishOpen) onPanelChange?.(null)
                }}
                contentClassName={PANEL_CLASS}
                trigger={
                    <span>
                        <OSButton
                            icon={<IconGlobe />}
                            size="md"
                            tooltip="Publish on WIM"
                            active={publishOpen}
                        />
                    </span>
                }
            >
                <NotebookPublishPanel
                    notebookId={notebookId}
                    notebookTitle={notebookTitle}
                    isOpen={publishOpen}
                    onPublish={onPublish}
                />
            </Popover>
        </>
    )
}
