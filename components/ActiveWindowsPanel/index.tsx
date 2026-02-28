"use client"

import React, { useEffect } from 'react'
import { useApp } from '../../context/App'
import type { AppWindow as AppWindowType } from '../../context/Window'
import SidePanel from 'components/SidePanel'
import ScrollArea from 'components/RadixUI/ScrollArea'
import OSButton from 'components/OSButton'
import { X } from 'lucide-react'

export default function ActiveWindowsPanel() {
    const {
        windows,
        isActiveWindowsPanelOpen,
        setIsActiveWindowsPanelOpen,
        focusedWindow,
        bringToFront,
        closeWindow,
        closeAllWindows,
    } = useApp()

    const closeActiveWindowsPanel = () => {
        setIsActiveWindowsPanelOpen(false)
    }

    // Add keyboard listener for Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isActiveWindowsPanelOpen) {
                e.preventDefault()
                closeActiveWindowsPanel()
            }
        }

        if (isActiveWindowsPanelOpen) {
            document.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isActiveWindowsPanelOpen])

    const handleWindowClick = (appWindow: AppWindowType) => {
        bringToFront(appWindow)
        closeActiveWindowsPanel()
    }

    const totalWindows = windows.length

    return (
        <SidePanel
            isOpen={isActiveWindowsPanelOpen}
            onClose={closeActiveWindowsPanel}
            title="active tabs"
            width="w-[calc(100vw-1rem)] sm:w-80"
            panelClassName="h-[calc(100vh-44px-0.75rem)] max-h-[calc(100vh-44px-0.75rem)] sm:h-[calc(100vh-2rem-44px)] sm:max-h-[calc(100vh-2rem-44px)]"
        >
            <div className="h-full flex flex-col lowercase">
                <ScrollArea className="p-1 h-full">
                    <div className="flex flex-col gap-1">
                        {windows.map((w) => (
                            <div key={w.key} className="relative group">
                                <OSButton
                                    size="sm"
                                    width="full"
                                    align="left"
                                    active={focusedWindow?.key === w.key}
                                    onClick={() => handleWindowClick(w)}
                                    className="justify-between py-1 h-auto min-h-0 pr-7"
                                >
                                    <span className={`flex-1 text-xs leading-tight text-left whitespace-normal break-words ${w.minimized ? 'italic opacity-60' : ''}`}>
                                        {w.title || 'untitled'}
                                    </span>
                                </OSButton>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        closeWindow(w)
                                    }}
                                    className="absolute right-1 top-1.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 z-10"
                                >
                                    <X className="size-3" />
                                </button>
                            </div>
                        ))}
                        {totalWindows === 0 && (
                            <div className="text-center text-zinc-400 p-8 italic text-xs">
                                no active tabs
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {totalWindows > 0 && (
                    <div className="p-2 mt-auto border-t border-primary bg-accent/20">
                        <h3 className="text-[11px] font-black opacity-40 tracking-widest m-0 mb-1 leading-none">desktop management</h3>
                        <p className="text-[10px] text-zinc-500 m-0 mb-2 leading-relaxed">
                            {totalWindows} open {totalWindows === 1 ? 'window' : 'windows'}.
                        </p>
                        <div className="flex flex-col gap-2">
                            <OSButton
                                variant="secondary"
                                size="xs"
                                width="full"
                                className="justify-center font-black tracking-widest text-[10px] gap-2"
                                onClick={() => {
                                    closeAllWindows()
                                    closeActiveWindowsPanel()
                                }}
                            >
                                <X className="size-3 text-navy" />
                                <span className="text-primary">close all windows</span>
                            </OSButton>
                        </div>
                    </div>
                )}
            </div>
        </SidePanel >
    )
}
