import React, { useState } from 'react'
import {
  IconExternal,
  IconSidePanel,
  IconPlus,
  IconCheck,
} from '@posthog/icons'
import { LemonButton } from '../LemonUI/LemonButton'

interface HeaderBarProps {
  onOpenContextPanel: () => void
  onNewChat: () => void
  isContextPanelOpen: boolean
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenContextPanel,
  onNewChat,
  isContextPanelOpen,
}) => {
  const [copiedLink, setCopiedLink] = useState(false)

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  return (
    <div
      id="header-bar"
      className="flex items-center justify-between px-4 py-2.5 bg-[#f4f4f3] dark:bg-dark border-b border-[#e5e7eb] dark:border-accent-dark select-none"
    >
      <div className="flex items-center gap-2">
        <LemonButton
          type="secondary"
          size="small"
          onClick={handleCopyLink}
          sideIcon={copiedLink ? <IconCheck className="text-green-600" /> : <IconExternal />}
          style={{ background: '#ffffff', borderColor: '#e5e7eb', fontSize: '13px', fontWeight: 500 }}
        >
          {copiedLink ? 'Copied link!' : 'Copy link to chat'}
        </LemonButton>

        <LemonButton
          type="secondary"
          size="small"
          onClick={onOpenContextPanel}
          sideIcon={<IconSidePanel />}
          style={{
            background: isContextPanelOpen ? '#e5e7eb' : '#ffffff',
            borderColor: '#e5e7eb',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Open in context panel
        </LemonButton>
      </div>

      <LemonButton
        type="tertiary"
        size="small"
        onClick={onNewChat}
        icon={<IconPlus />}
        title="New Chat"
      />
    </div>
  )
}
