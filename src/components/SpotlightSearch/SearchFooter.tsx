import React from 'react'
import KeyboardShortcut from 'components/KeyboardShortcut'

export default function SearchFooter({
    filterMenuOpen,
    activeFilter,
}: {
    filterMenuOpen: boolean
    activeFilter: string | null
}): JSX.Element {
    return (
        <div className="hidden @sm:flex flex-col border-t shrink-0 border-primary bg-primary">
            <div className="flex justify-between items-center px-4 py-2 text-xs text-secondary w-full border-b border-primary/20">
                {filterMenuOpen ? (
                    <>
                        <div className="flex gap-3 items-center">
                            <span>
                                <KeyboardShortcut text="↑" size="xs" />
                                <KeyboardShortcut text="↓" size="xs" /> navigate
                            </span>
                            <span>
                                <KeyboardShortcut text="↵" size="xs" /> apply filter
                            </span>
                        </div>
                        <span>
                            <KeyboardShortcut text="esc" size="xs" /> close
                        </span>
                    </>
                ) : (
                    <>
                        <div className="flex gap-3 items-center">
                            <span>
                                <KeyboardShortcut text="↑" size="xs" />
                                <KeyboardShortcut text="↓" size="xs" /> navigate
                            </span>
                            <span>
                                <KeyboardShortcut text="↵" size="xs" /> open
                            </span>
                            <span className="hidden @md:inline">
                                <KeyboardShortcut text="⌘F" size="xs" /> filter
                            </span>
                            {activeFilter && (
                                <span>
                                    <KeyboardShortcut text="⌫" size="xs" /> remove filter
                                </span>
                            )}
                        </div>
                        <span>
                            <KeyboardShortcut text="⇧" size="xs" />
                            <KeyboardShortcut text="↵" size="xs" /> talk to a robot
                        </span>
                    </>
                )}
            </div>

            <div className="flex gap-4 items-center justify-center px-4 py-1.5 text-[10px] w-full bg-accent/30 font-medium">
                <span className="text-primary flex items-center gap-1.5 font-semibold">
                    Global Site Search (⌘K)
                </span>
                <span className="text-muted/60 flex items-center gap-1.5">
                    Taskbar Tools
                </span>
                <span className="text-muted/60 flex items-center gap-1.5">
                    Notebook Find
                </span>
            </div>
        </div>
    )
}
