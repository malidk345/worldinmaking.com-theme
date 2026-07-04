import React, { useEffect, useState } from 'react'
import { motion, useDragControls, PanInfo } from 'framer-motion'
import { AppLink, AppItem } from 'components/OSIcons/AppIcon'
import ZoomHover from 'components/ZoomHover'
import { useApp } from '../../context/App'

interface DraggableDesktopIconProps {
    id?: string
    app: AppItem
    initialPosition: { x: number; y: number }
    onPositionChange: (position: { x: number; y: number }) => void
    className?: string
}

export default function DraggableDesktopIcon({ id, app, initialPosition, onPositionChange, className }: DraggableDesktopIconProps) {
    const [position, setPosition] = useState(initialPosition)
    const [isDragging, setIsDragging] = useState(false)
    const [isArchiving, setIsArchiving] = useState(false)
    const [hasDragged, setHasDragged] = useState(false)
    const controls = useDragControls()
    const { constraintsRef, isMobile, archiveItem } = useApp()

    useEffect(() => {
        setPosition(initialPosition)
    }, [initialPosition])

    const handleDragStart = () => {
        setIsDragging(true)
        setHasDragged(false)
    }

    const handleDrag = (_event: unknown, info: PanInfo) => {
        if (!isDragging) setIsDragging(true)
        if (Math.abs(info.offset.x) > 5 || Math.abs(info.offset.y) > 5) {
            setHasDragged(true)
        }

        // Live collision detection with archive folder
        const folderEl = document.getElementById('desktop-folder-archive')
        if (folderEl && app.label !== 'archive') {
            const rect = folderEl.getBoundingClientRect()
            const isOver = info.point.x >= rect.left &&
                           info.point.x <= rect.right &&
                           info.point.y >= rect.top &&
                           info.point.y <= rect.bottom
            
            if (isOver) {
                folderEl.classList.add('scale-115', 'bg-white/10', 'dark:bg-white/5', 'ring-1', 'ring-primary/20', 'shadow-md')
            } else {
                folderEl.classList.remove('scale-115', 'bg-white/10', 'dark:bg-white/5', 'ring-1', 'ring-primary/20', 'shadow-md')
            }
        }
    }

    const handleDragEnd = (_event: unknown, info: PanInfo) => {
        setIsDragging(false)
        if (!constraintsRef.current) return

        // Drop collision detection with archive folder
        const folderEl = document.getElementById('desktop-folder-archive')
        let droppedInFolder = false
        if (folderEl && app.label !== 'archive') {
            const rect = folderEl.getBoundingClientRect()
            droppedInFolder = info.point.x >= rect.left &&
                              info.point.x <= rect.right &&
                              info.point.y >= rect.top &&
                              info.point.y <= rect.bottom
            
            folderEl.classList.remove('scale-115', 'bg-white/10', 'dark:bg-white/5', 'ring-1', 'ring-primary/20', 'shadow-md')
        }

        if (droppedInFolder && app.label !== 'archive') {
            setIsArchiving(true)
            setTimeout(() => {
                archiveItem(app.label)
            }, 300)
            return
        }

        const bounds = constraintsRef.current.getBoundingClientRect()
        const newX = position.x + info.offset.x
        const newY = position.y + info.offset.y

        // Keep icon within bounds
        const iconWidth = 112 // w-28 = 112px
        const iconHeight = 90 // approximate height
        const maxX = bounds.width - iconWidth
        const maxY = bounds.height - iconHeight

        const constrainedPosition = {
            x: Math.max(0, Math.min(maxX, newX)),
            y: Math.max(0, Math.min(maxY, newY)),
        }

        setPosition(constrainedPosition)
        onPositionChange(constrainedPosition)

        // Reset drag state after a short delay to prevent click
        setTimeout(() => {
            setHasDragged(false)
        }, 100)
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    return (
        <motion.li
            id={id}
            className={className || `absolute w-28 flex justify-center items-center ${isDragging ? 'z-50' : 'z-10'}`}
            animate={isArchiving ? {
                scale: 0,
                opacity: 0,
                x: position.x,
                y: position.y
            } : {
                x: position.x,
                y: position.y,
                scale: 1,
                opacity: 1,
            }}
            drag={true}
            dragControls={controls}
            dragListener={false}
            dragMomentum={false}
            dragConstraints={constraintsRef}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onMouseDown={handleMouseDown}
            whileDrag={{ scale: 1.1, rotate: 2 }}
            initial={{ x: position.x, y: position.y }}
            transition={isArchiving ? { duration: 0.3, ease: 'easeInOut' } : { duration: 0.3, ease: 'easeOut' }}
        >
            <div
                className="relative cursor-move"
                onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    controls.start(e)
                }}
            >
                <ZoomHover>
                    <AppLink {...app} hasDragged={hasDragged} />
                </ZoomHover>
            </div>
        </motion.li>
    )
}
