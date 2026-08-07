import React, { useState, useEffect, useRef } from 'react'
import { BlockType } from '../../types/blocks'
import {
    Heading1,
    Heading2,
    Heading3,
    Pilcrow,
    List,
    ListOrdered,
    Code,
    Table,
    Image,
    FileText,
    Quote,
    Minus,
    AlertCircle,
    SquarePlus,
} from 'lucide-react'

export interface SlashCommandOption {
    type: BlockType
    label: string
    description: string
    icon: React.ReactNode
    keywords: string[]
}

export const SLASH_COMMAND_OPTIONS: SlashCommandOption[] = [
    {
        type: 'paragraph',
        label: 'Text Paragraph',
        description: 'Just start writing with plain text formatting.',
        icon: <Pilcrow className="w-4 h-4 text-secondary" />,
        keywords: ['text', 'paragraph', 'plain'],
    },
    {
        type: 'heading_1',
        label: 'Heading 1',
        description: 'Big section heading for main topics.',
        icon: <Heading1 className="w-4 h-4 text-yellow" />,
        keywords: ['h1', 'heading1', 'title', 'large'],
    },
    {
        type: 'heading_2',
        label: 'Heading 2',
        description: 'Medium section heading for sub-topics.',
        icon: <Heading2 className="w-4 h-4 text-yellow" />,
        keywords: ['h2', 'heading2', 'subtitle', 'medium'],
    },
    {
        type: 'heading_3',
        label: 'Heading 3',
        description: 'Small section heading for subsections.',
        icon: <Heading3 className="w-4 h-4 text-yellow" />,
        keywords: ['h3', 'heading3', 'small'],
    },
    {
        type: 'subpage_card',
        label: 'Sub-page Card',
        description: 'Create a visual Craft-style sub-page card.',
        icon: <SquarePlus className="w-4 h-4 text-blue-400" />,
        keywords: ['page', 'card', 'subpage', 'craft'],
    },
    {
        type: 'callout',
        label: 'Callout Box',
        description: 'Highlight important notes, quotes or tips.',
        icon: <AlertCircle className="w-4 h-4 text-orange-400" />,
        keywords: ['callout', 'info', 'note', 'alert'],
    },
    {
        type: 'code_block',
        label: 'Code Block',
        description: 'Syntax highlighted code snippet.',
        icon: <Code className="w-4 h-4 text-green-400" />,
        keywords: ['code', 'snippet', 'developer', 'js', 'ts'],
    },
    {
        type: 'table',
        label: 'Database Table',
        description: 'Structured database table with typed columns.',
        icon: <Table className="w-4 h-4 text-purple-400" />,
        keywords: ['table', 'grid', 'database', 'spreadsheet'],
    },
    {
        type: 'bulleted_list',
        label: 'Bulleted List',
        description: 'Create a bullet point list.',
        icon: <List className="w-4 h-4 text-secondary" />,
        keywords: ['bullet', 'list', 'ul'],
    },
    {
        type: 'numbered_list',
        label: 'Numbered List',
        description: 'Create an ordered list with numbers.',
        icon: <ListOrdered className="w-4 h-4 text-secondary" />,
        keywords: ['number', 'list', 'ol'],
    },
    {
        type: 'quote',
        label: 'Quote Block',
        description: 'Capture a memorable quote or excerpt.',
        icon: <Quote className="w-4 h-4 text-secondary" />,
        keywords: ['quote', 'excerpt', 'citation'],
    },
    {
        type: 'divider',
        label: 'Divider Line',
        description: 'Visually divide sections with a line.',
        icon: <Minus className="w-4 h-4 text-muted" />,
        keywords: ['divider', 'line', 'hr', 'separator'],
    },
]

interface SlashCommandMenuProps {
    isOpen: boolean
    onClose: () => void
    onSelectBlockType: (type: BlockType) => void
    position: { top: number; left: number }
}

export function SlashCommandMenu({ isOpen, onClose, onSelectBlockType, position }: SlashCommandMenuProps) {
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)

    const filteredOptions = SLASH_COMMAND_OPTIONS.filter((opt) => {
        if (!query.trim()) return true
        const q = query.toLowerCase()
        return (
            opt.label.toLowerCase().includes(q) ||
            opt.description.toLowerCase().includes(q) ||
            opt.keywords.some((k) => k.toLowerCase().includes(q))
        )
    })

    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length))
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (filteredOptions[selectedIndex]) {
                    onSelectBlockType(filteredOptions[selectedIndex].type)
                    onClose()
                }
            } else if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, filteredOptions, selectedIndex, onSelectBlockType, onClose])

    if (!isOpen) return null

    return (
        <div
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 w-72 bg-primary border border-primary rounded-2xl shadow-2xl overflow-hidden p-2 text-primary backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-150"
        >
            <div className="px-2 py-1.5 border-b border-primary mb-1">
                <input
                    type="text"
                    autoFocus
                    placeholder="Type to filter blocks..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-accent border border-primary rounded-xl px-2.5 py-1 text-xs text-primary placeholder-muted outline-none focus:border-accent"
                />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-0.5">
                {filteredOptions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted">No matching block types</div>
                ) : (
                    filteredOptions.map((option, idx) => {
                        const isSelected = idx === selectedIndex
                        return (
                            <button
                                key={option.type}
                                onClick={() => {
                                    onSelectBlockType(option.type)
                                    onClose()
                                }}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                className={`w-full text-left p-2 rounded-xl flex items-center gap-3 transition-colors ${
                                    isSelected ? 'bg-accent border border-primary' : 'hover:bg-accent/50 border border-transparent'
                                }`}
                            >
                                <div className="p-1.5 rounded-lg bg-primary border border-primary shrink-0 shadow-sm">
                                    {option.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-primary truncate leading-snug">{option.label}</div>
                                    <div className="text-[10px] text-muted truncate leading-tight">{option.description}</div>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
