import React, { useState } from 'react'
import { PostHogTableSpec } from './PostHogTheme'
import { LemonCard } from '../LemonUI/LemonCard'
import { LemonTag } from '../LemonUI/LemonTag'
import { Table, ArrowUpDown } from 'lucide-react'

interface LemonTableProps {
    spec: PostHogTableSpec
    className?: string
}

export const LemonTable: React.FC<LemonTableProps> = ({ spec, className = '' }) => {
    const [sortCol, setSortCol] = useState<number | null>(null)
    const [sortAsc, setSortAsc] = useState<boolean>(true)

    if (!spec || !spec.columns || spec.columns.length === 0 || !spec.rows || spec.rows.length === 0) {
        return null
    }

    const handleSort = (colIndex: number) => {
        if (sortCol === colIndex) {
            setSortAsc(!sortAsc)
        } else {
            setSortCol(colIndex)
            setSortAsc(true)
        }
    }

    const sortedRows = [...spec.rows].sort((a, b) => {
        if (sortCol === null) return 0
        const valA = typeof a[sortCol] === 'object' && a[sortCol] !== null ? (a[sortCol] as any).badge : a[sortCol]
        const valB = typeof b[sortCol] === 'object' && b[sortCol] !== null ? (b[sortCol] as any).badge : b[sortCol]

        const numA = typeof valA === 'number' ? valA : parseFloat(String(valA).replace(/[^0-9.-]+/g, ''))
        const numB = typeof valB === 'number' ? valB : parseFloat(String(valB).replace(/[^0-9.-]+/g, ''))

        if (!isNaN(numA) && !isNaN(numB)) {
            return sortAsc ? numA - numB : numB - numA
        }

        return sortAsc
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA))
    })

    return (
        <LemonCard className={`w-full p-4 ${className}`} hoverEffect={false}>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-primary/20">
                <div className="flex items-center gap-2">
                    <Table className="size-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-[12px] font-semibold text-primary uppercase tracking-wider">
                        {spec.title || 'Data Breakdown'}
                    </span>
                </div>
                <span className="text-[11px] text-muted font-mono">
                    {spec.rows.length} rows
                </span>
            </div>

            <div className="LemonTable overflow-x-auto rounded-lg border border-primary/20">
                <div className="LemonTable__content">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-primary/5 border-b border-primary/20">
                                {spec.columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        onClick={() => handleSort(idx)}
                                        className="py-2.5 px-3 font-semibold text-[11px] text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>{col}</span>
                                            <ArrowUpDown className="size-3 opacity-40 hover:opacity-100" />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRows.map((row, rowIdx) => (
                                <tr
                                    key={rowIdx}
                                    className="border-b border-primary/10 hover:bg-primary/5 transition-colors"
                                >
                                    {row.map((cell, cellIdx) => {
                                        const isBadge = typeof cell === 'object' && cell !== null && (cell as any).badge !== undefined
                                        const badgeType = isBadge ? (cell as any).type || 'default' : 'default'
                                        const val = isBadge ? (cell as any).badge : cell
                                        const isNumber = typeof val === 'number' || (!isNaN(parseFloat(String(val))) && !String(val).includes(' '))

                                        return (
                                            <td
                                                key={cellIdx}
                                                className={`py-2 px-3 text-[12.5px] ${isNumber && cellIdx > 0 ? 'font-mono text-primary font-medium' : 'text-primary/90'}`}
                                            >
                                                {isBadge ? (
                                                    <LemonTag type={badgeType} size="small">
                                                        {val}
                                                    </LemonTag>
                                                ) : (
                                                    val
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </LemonCard>
    )
}