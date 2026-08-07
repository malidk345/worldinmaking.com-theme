import React, { useState } from 'react'
import { AppLink, AppItem } from 'components/OSIcons/AppIcon'
import ZoomHover from 'components/ZoomHover'
import { useArchive } from 'context/ArchiveContext'
import { IconArchive } from '@posthog/icons'

interface DesktopIconProps {
    app: AppItem
}

export default function DesktopIcon({ app }: DesktopIconProps) {
    const { archiveApp, isArchived, isHydrated } = useArchive()
    const [isDragOver, setIsDragOver] = useState(false)
    const [isDraggingSelf, setIsDraggingSelf] = useState(false)

    const appUrl = app.url || ''
    const isArchiveIcon = appUrl === '/archive'

    // If item is archived and context is hydrated, hide it from desktop grid
    if (isHydrated && isArchived(appUrl)) {
        return null
    }

    const handleDragStart = (e: React.DragEvent) => {
        setIsDraggingSelf(true)
        e.dataTransfer.setData('text/plain', appUrl)
        e.dataTransfer.setData('text/label', app.label || appUrl)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragEnd = () => {
        setIsDraggingSelf(false)
    }

    const handleDragOver = (e: React.DragEvent) => {
        if (!isArchiveIcon) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
    }

    const handleDragLeave = () => {
        if (!isArchiveIcon) return
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        if (!isArchiveIcon) return
        e.preventDefault()
        setIsDragOver(false)
        const url = e.dataTransfer.getData('text/plain')
        const label = e.dataTransfer.getData('text/label')
        if (url && url !== '/archive') {
            archiveApp(url, label)
        }
    }

    return (
        <li
            data-icon-label={app.label}
            className={`w-28 min-h-[84px] flex justify-center items-start transition-all duration-200 relative ${
                isDraggingSelf ? 'opacity-40 scale-95' : 'opacity-100'
            }`}
            draggable={!isArchiveIcon}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <ZoomHover>
                <div
                    className={`relative w-full flex flex-col items-center rounded-2xl transition-all duration-300 ${
                        isArchiveIcon && isDragOver
                            ? 'scale-110 z-30 ring-4 ring-yellow/80 bg-yellow/20 backdrop-blur-md shadow-2xl p-1 animate-pulse'
                            : ''
                    }`}
                >
                    <AppLink {...app} />
                    {isArchiveIcon && isDragOver && (
                        <div className="absolute -top-4 bg-yellow text-dark text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xl animate-bounce flex items-center gap-1 border border-yellow/40">
                            <IconArchive className="w-3 h-3" /> Drop to Archive Vault
                        </div>
                    )}
                </div>
            </ZoomHover>
        </li>
    )
}
