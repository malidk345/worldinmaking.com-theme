import React from 'react'
import { PanelLeft } from 'lucide-react'

export type InquiryStreamStatus = 'thinking' | 'quality' | 'answering' | null

interface HeaderProps {
    onToggleSidebar: () => void
    activeChatTitle?: string
    boundNotebookTitle?: string
    isStreaming?: boolean
    streamStatus?: InquiryStreamStatus
    philosopherName?: string
}

function surname(name?: string): string {
    if (!name) return 'AI'
    const parts = name.trim().split(/\s+/).filter(Boolean)
    return parts[parts.length - 1] || name
}

function streamLabel(status?: InquiryStreamStatus): string {
    if (status === 'quality') return 'Checking quality'
    if (status === 'answering') return 'Answering'
    return 'Thinking'
}

export const Header: React.FC<HeaderProps> = ({
    onToggleSidebar,
    activeChatTitle,
    boundNotebookTitle,
    isStreaming,
    streamStatus,
    philosopherName,
}) => {
    return (
        <header className="flex h-10 shrink-0 items-center gap-1 border-b border-primary/40 bg-primary/40 px-2 pr-24 backdrop-blur-md">
            <button
                type="button"
                onClick={onToggleSidebar}
                className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-accent/80 transition-all duration-150 active:scale-95 cursor-pointer"
                title="Chat history"
            >
                <PanelLeft className="h-4 w-4 stroke-[1.6]" />
            </button>

            <div className="min-w-0 flex-1 truncate px-1">
                <div className="truncate text-[13px] font-medium tracking-tight text-primary">
                    {activeChatTitle || 'New inquiry'}
                </div>
                {boundNotebookTitle ? (
                    <div className="truncate text-[10px] tracking-wide text-muted">{boundNotebookTitle}</div>
                ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2 pr-1 text-[11px] text-secondary">
                {isStreaming ? (
                    <span className="inline-flex items-center gap-1.5 text-primary">
                        <span className="size-1.5 rounded-full bg-[#1E3A8A] animate-pulse" />
                        {streamLabel(streamStatus)}
                    </span>
                ) : philosopherName ? (
                    <span className="text-muted">{surname(philosopherName)}</span>
                ) : null}
            </div>
        </header>
    )
}