import React, { useState } from 'react'
import { NotebookBlock } from '../../types/blocks'
import { BlockHandleMenu } from './BlockHandleMenu'

interface BlockDragContainerProps {
    block: NotebookBlock
    index: number
    onMoveBlock: (dragIndex: number, hoverIndex: number) => void
    onDuplicate: (blockId: string) => void
    onDelete: (blockId: string) => void
    onChangeType: (blockId: string, newType: any) => void
    onChangeColor?: (blockId: string, color: string) => void
    children: React.ReactNode
}

export function BlockDragContainer({
    block,
    index,
    onMoveBlock,
    onDuplicate,
    onDelete,
    onChangeType,
    onChangeColor,
    children,
}: BlockDragContainerProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [isDragOver, setIsDragOver] = useState(false)

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true)
        e.dataTransfer.setData('text/plain', String(index))
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragEnd = () => {
        setIsDragging(false)
        setIsDragOver(false)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
    }

    const handleDragLeave = () => {
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const dragIndexStr = e.dataTransfer.getData('text/plain')
        if (dragIndexStr !== '') {
            const dragIndex = parseInt(dragIndexStr, 10)
            if (!isNaN(dragIndex) && dragIndex !== index) {
                onMoveBlock(dragIndex, index)
            }
        }
    }

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ backgroundColor: block.metadata?.backgroundColor || 'transparent' }}
            className={`group/block relative flex items-start gap-2 rounded-xl transition-all duration-150 p-1 ${
                isDragging ? 'opacity-30 scale-98 border border-dashed border-yellow' : 'opacity-100'
            } ${isDragOver ? 'border-t-2 border-yellow bg-yellow/5' : ''}`}
        >
            {/* Left Hover Handle (⋮⋮) */}
            <div className="opacity-0 group-hover/block:opacity-100 transition-opacity pt-1 shrink-0">
                <BlockHandleMenu
                    block={block}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onChangeType={onChangeType}
                    onChangeColor={onChangeColor}
                />
            </div>

            {/* Main Block Content */}
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    )
}
