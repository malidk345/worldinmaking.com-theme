import React from 'react'
import { PanelLeft } from 'lucide-react'
import type { AgentMode } from '../types'

interface HeaderProps {
    onToggleSidebar: () => void
    activeChatTitle?: string
    boundNotebookTitle?: string
    agentMode?: AgentMode
    onAgentModeChange?: (mode: AgentMode) => void
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, activeChatTitle, boundNotebookTitle, agentMode = 'ask', onAgentModeChange }) => {
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

            <div className="min-w-0 flex-1 flex items-center justify-between">
                <div className="truncate px-1 text-[13px] text-secondary">
                    {activeChatTitle || 'New chat'}
                    {boundNotebookTitle ? (
                        <span className="text-muted"> · {boundNotebookTitle}</span>
                    ) : null}
                </div>

                <div className="flex items-center gap-2">
                    {agentMode === 'plan' && (
                        <span className="text-[10px] text-muted hidden sm:inline-block">
                            mutating tools locked
                        </span>
                    )}
                    <div className="flex items-center rounded-lg border border-primary p-0.5 bg-primary">
                        {(["ask", "plan", "execute"] as AgentMode[]).map(mode => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => onAgentModeChange?.(mode)}
                                className={`px-2 py-0.5 text-[11px] font-medium rounded-md capitalize transition-colors cursor-pointer ${
                                    agentMode === mode
                                    ? 'bg-accent text-primary shadow-sm'
                                    : 'text-muted hover:text-primary hover:bg-accent/50'
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </header>
    )
}
