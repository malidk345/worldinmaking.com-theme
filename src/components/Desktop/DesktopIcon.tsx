import React, { useEffect, useRef, useState } from 'react'
import { AppLink, AppItem } from 'components/OSIcons/AppIcon'
import ZoomHover from 'components/ZoomHover'
import { useArchive } from 'context/ArchiveContext'
import { useTrash } from 'context/TrashContext'

interface DesktopIconProps {
    app: AppItem
}

function setIconDragImage(e: React.DragEvent, node: HTMLElement | null) {
    if (!node || typeof e.dataTransfer.setDragImage !== 'function') return

    const rect = node.getBoundingClientRect()
    const ghost = node.cloneNode(true) as HTMLElement
    ghost.setAttribute('aria-hidden', 'true')
    ghost.style.cssText = [
        'position:fixed',
        'top:-999px',
        'left:0',
        `width:${Math.round(rect.width)}px`,
        'margin:0',
        'pointer-events:none',
        'opacity:0.92',
        'z-index:0',
    ].join(';')
    document.body.appendChild(ghost)
    // Hotspot sits on the glyph, not the label, so the icon tracks the cursor.
    e.dataTransfer.setDragImage(ghost, Math.round(rect.width / 2), 22)
    window.setTimeout(() => ghost.remove(), 0)
}

export default function DesktopIcon({ app }: DesktopIconProps) {
    const { archiveApp, isArchived, isHydrated } = useArchive()
    const { moveToTrash, isTrashed } = useTrash()
    const [isDragOver, setIsDragOver] = useState(false)
    const [isDraggingSelf, setIsDraggingSelf] = useState(false)
    const [blockClick, setBlockClick] = useState(false)
    const visualRef = useRef<HTMLDivElement>(null)

    const appUrl = app.url || ''
    const isArchiveIcon = appUrl === '/archive'
    const isTrashIcon = appUrl === '/trash'

    useEffect(() => {
        if (!blockClick || isDraggingSelf) return
        const clear = () => setBlockClick(false)
        window.addEventListener('click', clear, { capture: true, once: true })
        return () => window.removeEventListener('click', clear, { capture: true })
    }, [blockClick, isDraggingSelf])

    if (isHydrated && (isArchived(appUrl) || isTrashed(appUrl))) {
        return null
    }

    const handleDragStart = (e: React.DragEvent) => {
        setIsDraggingSelf(true)
        setBlockClick(true)
        e.dataTransfer.setData('text/plain', appUrl)
        e.dataTransfer.setData('text/label', app.label || appUrl)
        e.dataTransfer.effectAllowed = 'move'
        setIconDragImage(e, visualRef.current)
    }

    const handleDragEnd = () => {
        setIsDraggingSelf(false)
        setIsDragOver(false)
    }

    const handleDragOver = (e: React.DragEvent) => {
        if (!isArchiveIcon && !isTrashIcon) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        if (!isArchiveIcon && !isTrashIcon) return
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        if (!isArchiveIcon && !isTrashIcon) return
        e.preventDefault()
        setIsDragOver(false)
        const url = e.dataTransfer.getData('text/plain')
        const label = e.dataTransfer.getData('text/label')
        if (url && url !== appUrl) {
            if (isTrashIcon) {
                moveToTrash({ url, label, type: 'app' })
            } else {
                archiveApp(url, label)
            }
        }
    }

    return (
        <li
            data-icon-label={app.label}
            className={`w-28 min-h-[84px] flex justify-center items-start transition-opacity duration-150 relative [&_a]:[-webkit-user-drag:none] ${
                isDraggingSelf ? 'opacity-35 cursor-grabbing' : isArchiveIcon ? '' : 'cursor-grab'
            }`}
            draggable={!isArchiveIcon}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <ZoomHover className={isDraggingSelf ? 'pointer-events-none top-0' : undefined}>
                <div
                    ref={visualRef}
                    data-desktop-icon-visual
                    className={`relative w-full flex flex-col items-center rounded-xl transition-[color,transform,box-shadow,background-color] duration-150 ${
                        (isArchiveIcon || isTrashIcon) && isDragOver
                            ? isTrashIcon
                                ? 'scale-[1.04] ring-2 ring-red/40 bg-red/10 p-1'
                                : 'scale-[1.04] ring-2 ring-blue/40 bg-blue/10 p-1'
                            : ''
                    }`}
                >
                    <AppLink {...app} hasDragged={blockClick} />
                </div>
            </ZoomHover>
        </li>
    )
}
