import React, { useState } from 'react'
import { Link2, ChevronDown, ChevronRight, FileText, ExternalLink } from 'lucide-react'
import type { BacklinkItem } from './wikilinks'
import { useAppActions, useAppSettings, useAppWindows } from '../../../../context/App'
import { openNotebookWindow } from '../../../../lib/open-notebook-window'

export interface BacklinksPanelProps {
    backlinks: BacklinkItem[]
    currentNotebookTitle?: string
}

export function BacklinksPanel({ backlinks, currentNotebookTitle }: BacklinksPanelProps): JSX.Element | null {
    const [isOpen, setIsOpen] = useState(true)
    const { addWindow, updateWindow } = useAppActions()
    const { windows } = useAppWindows()
    const { isMobile } = useAppSettings()

    if (!backlinks || backlinks.length === 0) {
        return null
    }

    const handleOpenReferencingNotebook = (notebookId: string, title: string) => {
        openNotebookWindow({
            notebookId,
            notebookTitle: title,
            windows,
            isMobile,
            addWindow,
            updateWindow,
        })
    }

    return (
        <div className="mt-8 pt-4 border-t border-border/60 font-sans text-sm select-none">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group mb-3"
            >
                {isOpen ? (
                    <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                    <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
                <span className="flex items-center gap-1.5">
                    <Link2 className="size-3.5 text-primary/70" />
                    <span>Referenced in ({backlinks.length})</span>
                </span>
            </button>

            {isOpen && (
                <div className="grid gap-2.5 sm:grid-cols-2">
                    {backlinks.map((link) => (
                        <div
                            key={link.sourceNotebookId}
                            onClick={() => handleOpenReferencingNotebook(link.sourceNotebookId, link.sourceTitle)}
                            className="group flex flex-col justify-between p-3 rounded-lg border border-border/50 bg-accent/10 hover:bg-accent/25 hover:border-border cursor-pointer transition-all shadow-2xs"
                        >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 font-medium text-foreground text-xs truncate">
                                    <FileText className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                                    <span className="truncate">{link.sourceTitle}</span>
                                </div>
                                <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 italic leading-relaxed">
                                {link.contextSnippet}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
