import React, { useState } from 'react'
import { AppLink, AppItem } from 'components/OSIcons/AppIcon'
import ZoomHover from 'components/ZoomHover'
import { useArchive } from 'context/ArchiveContext'

interface DesktopIconProps {
    app: AppItem
}

export default function DesktopIcon({ app }: DesktopIconProps) {
    const { archiveApp, isArchived, isHydrated } = useArchive()
    const [isDragOver, setIsDragOver] = useState(false)
    const [isDraggingSelf, setIsDraggingSelf] = useState(false)

    const appUrl = app.url || ''
    const isArchiveIcon = appUrl === '/archive'

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

    const handleDragLeave = (e: React.DragEvent) => {
        if (!isArchiveIcon) return
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
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
            className={`w-28 min-h-[84px] flex justify-center items-start transition-opacity duration-150 relative ${
                isDraggingSelf ? 'opacity-40' : 'opacity-100'
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
                    className={`relative w-full flex flex-col items-center rounded-xl transition-colors duration-150 ${
                        isArchiveIcon && isDragOver ? 'ring-2 ring-blue/50 bg-blue/10 p-1' : ''
                    }`}
                >
                    <AppLink {...app} />
                </div>
            </ZoomHover>
        </li>
    )
}
