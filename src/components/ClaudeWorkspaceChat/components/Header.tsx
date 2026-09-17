import React from 'react'
import { Notebook, PanelLeft } from 'lucide-react'

interface HeaderProps {
    onToggleSidebar: () => void
    onOpenScratchpad?: () => void
}

export const Header: React.FC<HeaderProps> = ({
    onToggleSidebar,
    onOpenScratchpad,
}) => {
    return (
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-9 items-center gap-0.5 bg-transparent px-2 pr-24">
            <button
                type="button"
                onClick={onToggleSidebar}
                className="pointer-events-auto p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-accent/80 transition-all duration-150 active:scale-95 cursor-pointer"
                title="Chat history"
            >
                <PanelLeft className="h-4 w-4 stroke-[1.6]" />
            </button>
            {onOpenScratchpad ? (
                <button
                    type="button"
                    onClick={onOpenScratchpad}
                    className="pointer-events-auto p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-accent/80 transition-all duration-150 active:scale-95 cursor-pointer"
                    title="Scratchpad"
                >
                    <Notebook className="h-4 w-4 stroke-[1.6]" />
                </button>
            ) : null}
        </header>
    )
}
