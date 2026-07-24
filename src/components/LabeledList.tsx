import React from 'react'

export interface LabeledListItem {
    label: string
    description?: React.ReactNode
}

export interface LabeledListProps {
    items: LabeledListItem[]
    columns?: number[]
    className?: string
}

export const LabeledList = ({ items, className = '' }: LabeledListProps) => {
    if (!items || !items.length) return null
    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
            {items.map((item, index) => (
                <div key={index} className="space-y-1">
                    <div className="font-semibold text-primary">{item.label}</div>
                    {item.description && <div className="text-sm text-secondary">{item.description}</div>}
                </div>
            ))}
        </div>
    )
}

export default LabeledList
