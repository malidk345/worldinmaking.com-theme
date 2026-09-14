import React from 'react'
import { PanelLeft } from 'lucide-react'
import type { AgentMode } from '../types'

interface HeaderProps {
    onToggleSidebar: () => void
    activeChatTitle?: string
    boundNotebookTitle?: string
    agentMode?: AgentMode
    onChangeAgentMode?: (mode: AgentMode) => void
    isPlanLocked?: boolean
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, activeChatTitle, boundNotebookTitle, agentMode, onChangeAgentMode, isPlanLocked }) => {
    return (
        <header className="flex h-9 shrink-0 items-center gap-0.5 px-2">
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

            <div className="flex items-center gap-2">
                {isPlanLocked ? (
                    <div className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-accent text-muted border border-black/5 dark:border-white/5 flex items-center gap-1.5 shadow-sm">
                        <div className="size-1.5 rounded-full bg-primary/50 animate-pulse" />
                        <span>Plan Active</span>
                    </div>
                ) : onChangeAgentMode ? (
                    <div className="flex bg-accent/50 p-0.5 rounded-full border border-black/5 dark:border-white/5">
                        {(['ask', 'plan', 'execute'] as AgentMode[]).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => onChangeAgentMode(mode)}
                                className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all capitalize ${
                                    agentMode === mode
                                        ? 'bg-white dark:bg-[#121214] text-primary shadow-sm border border-black/5 dark:border-white/5'
                                        : 'text-secondary hover:text-primary'
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
        </header>
    )
}
