import React, { useEffect, useRef, useState } from 'react'
import { BlockType, NotebookBlock } from '../../types/blocks'
import { GripVertical, Copy, Trash2, Palette } from 'lucide-react'

interface BlockHandleMenuProps {
    block: NotebookBlock
    onDuplicate: (blockId: string) => void
    onDelete: (blockId: string) => void
    onChangeType: (blockId: string, newType: BlockType) => void
    onChangeColor?: (blockId: string, color: string) => void
}

export function BlockHandleMenu({ block, onDuplicate, onDelete, onChangeColor }: BlockHandleMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isOpen) return
        const close = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false)
        }
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', close)
            document.removeEventListener('keydown', onKey)
        }
    }, [isOpen])

    const colors = [
        { label: 'Default', bg: 'transparent' },
        { label: 'Red', bg: 'rgba(239, 68, 68, 0.15)' },
        { label: 'Yellow', bg: 'rgba(234, 179, 8, 0.15)' },
        { label: 'Green', bg: 'rgba(34, 197, 94, 0.15)' },
        { label: 'Blue', bg: 'rgba(59, 130, 246, 0.15)' },
        { label: 'Purple', bg: 'rgba(168, 85, 247, 0.15)' },
    ]

    return (
        <div className="relative inline-flex items-center group/handle" ref={menuRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                title="Drag to reorder or click for block options"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className="p-1 rounded-lg hover:bg-accent text-muted hover:text-primary transition-colors cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="w-4 h-4" />
            </button>

            {/* Context Dropdown Menu */}
            {isOpen && (
                <div
                    onMouseLeave={() => setIsOpen(false)}
                    className="absolute top-6 left-0 z-50 w-48 bg-primary border border-primary rounded-2xl shadow-2xl p-1.5 space-y-1 text-xs text-primary backdrop-blur-md animate-in fade-in duration-100"
                >
                    {/* Duplicate */}
                    <button
                        onClick={() => {
                            onDuplicate(block.id)
                            setIsOpen(false)
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-accent flex items-center gap-2 font-medium"
                    >
                        <Copy className="w-3.5 h-3.5 text-secondary" />
                        <span>Duplicate</span>
                    </button>

                    {/* Delete */}
                    <button
                        onClick={() => {
                            onDelete(block.id)
                            setIsOpen(false)
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-red/10 text-red flex items-center gap-2 font-medium"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-red" />
                        <span>Delete Block</span>
                    </button>

                    {/* Color Presets */}
                    {onChangeColor && (
                        <div className="p-2 border-t border-primary space-y-1.5">
                            <div className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
                                <Palette className="w-3 h-3" /> Background Color
                            </div>
                            <div className="flex items-center gap-1.5">
                                {colors.map((c) => (
                                    <button
                                        key={c.label}
                                        onClick={() => {
                                            onChangeColor(block.id, c.bg)
                                            setIsOpen(false)
                                        }}
                                        title={c.label}
                                        style={{ backgroundColor: c.bg === 'transparent' ? 'var(--bg-accent)' : c.bg }}
                                        className="w-5 h-5 rounded-full border border-primary hover:scale-110 transition-transform"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
