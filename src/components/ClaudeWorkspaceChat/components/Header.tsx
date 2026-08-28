import React from 'react'
import { PanelLeft } from 'lucide-react'

interface HeaderProps {
    onToggleSidebar: () => void
    activeChatTitle?: string
    boundNotebookTitle?: string
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, activeChatTitle, boundNotebookTitle }) => {
    return (
        <header className="flex h-9 shrink-0 items-center gap-0.5 px-2 pr-24">
            <button
                type="button"
                onClick={onToggleSidebar}
                className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                title="Chat history"
            >
                <PanelLeft className="h-4 w-4 stroke-[1.6]" />
            </button>

            <div className="min-w-0 flex-1 truncate px-1 text-[13px] text-secondary">
                {activeChatTitle || 'New chat'}
                {boundNotebookTitle ? (
                    <span className="text-muted"> · {boundNotebookTitle}</span>
                ) : null}
            </div>
        </header>
    )
}
