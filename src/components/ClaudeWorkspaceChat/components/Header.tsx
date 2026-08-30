import React from 'react'
import { PanelLeft, Sparkles } from 'lucide-react'
import { useUser } from '../../../hooks/useUser'
import { useApp } from '../../../context/App'
import { isUserPro } from '../../../lib/wim-billing'

interface HeaderProps {
    onToggleSidebar: () => void
    activeChatTitle?: string
    boundNotebookTitle?: string
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, activeChatTitle, boundNotebookTitle }) => {
    const { user } = useUser()
    const app = useApp()
    const isPro = isUserPro(user as any)

    return (
        <header className="flex h-9 shrink-0 items-center gap-0.5 px-2 pr-24">
            <button
                type="button"
                onClick={onToggleSidebar}
                className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-accent/80 transition-all duration-150 active:scale-95 cursor-pointer"
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

            {isPro ? (
                <button
                    type="button"
                    onClick={() => app?.addWindow?.({ path: '/pricing' })}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold border border-blue-500/20 hover:bg-blue-500/20 transition-all cursor-pointer mr-1 shrink-0"
                    title="Pro Membership Active"
                >
                    <Sparkles className="h-3 w-3" />
                    <span>Pro</span>
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => app?.addWindow?.({ path: '/pricing' })}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-[11px] font-medium border border-blue-500/20 transition-all cursor-pointer mr-1 shrink-0"
                    title="Upgrade to Pro"
                >
                    <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span>Upgrade</span>
                </button>
            )}
        </header>
    )
}
