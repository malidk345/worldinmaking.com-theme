import { LemonButton } from '~nb-lib/lemon-ui/index'
import { IconShare } from '@posthog/icons'

interface SidebarContextPanelMenuProps {
    onOpenShare?: (tab?: 'private' | 'publish') => void
}

/** Opens the unified Share modal on the Publish tab. */
export function SidebarContextPanelMenu({ onOpenShare }: SidebarContextPanelMenuProps) {
    return (
        <LemonButton
            size="small"
            type="secondary"
            icon={<IconShare />}
            onClick={() => onOpenShare?.('publish')}
            tooltip="Publish on your profile, or send the text privately"
        >
            <span className="hidden sm:inline">Share</span>
        </LemonButton>
    )
}
