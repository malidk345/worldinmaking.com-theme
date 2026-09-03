import { LemonButton, LemonDropdown } from '~nb-lib/lemon-ui/index'
import { IconShare } from '@posthog/icons'
import { NotebookShareModal, type NotebookPublishPayload, type NotebookShareTab } from './NotebookShareModal'

interface SidebarContextPanelMenuProps {
    notebookId: string
    notebookTitle: string
    onPublish: (meta: NotebookPublishPayload) => void
    initialTab?: NotebookShareTab
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
}

/** Share / publish control in the notebook top bar — LemonDropdown, same pattern as Notebooks. */
export function SidebarContextPanelMenu({
    notebookId,
    notebookTitle,
    onPublish,
    initialTab = 'publish',
    isOpen,
    onOpenChange,
}: SidebarContextPanelMenuProps) {
    return (
        <LemonDropdown
            overlay={
                <NotebookShareModal
                    isOpen={isOpen !== false}
                    onClose={() => onOpenChange?.(false)}
                    notebookId={notebookId}
                    notebookTitle={notebookTitle}
                    initialTab={initialTab}
                    onPublish={onPublish}
                />
            }
            visible={isOpen}
            onVisibilityChange={onOpenChange}
            closeOnClickInside={false}
            // Top-bar trigger on the right: open below, align to the button's end edge.
            placement="bottom-end"
            fallbackPlacements={['bottom-start', 'top-end', 'top-start']}
        >
            <LemonButton
                size="small"
                type="secondary"
                icon={<IconShare />}
                active={Boolean(isOpen)}
                tooltip="Publish on your profile, or send the text privately"
            >
                <span className="hidden sm:inline">Share</span>
            </LemonButton>
        </LemonDropdown>
    )
}
