import { IconArrowLeft, IconArrowRight, IconSpinner } from '@posthog/icons'
import React, { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { groupBy as _groupBy } from 'lodash'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { CallToAction } from 'components/CallToAction'
import OSButton from 'components/OSButton'

interface Column {
    name: string | React.ReactNode
    align?: 'left' | 'center' | 'right'
    width?: string
    className?: string
}

interface Row {
    key?: string
    cells: {
        content: React.ReactNode
        className?: string
        style?: React.CSSProperties
    }[]
}

interface OSTableProps {
    columns?: Column[]
    rows: Row[]
    className?: string
    rowAlignment?: 'top' | 'center'
    size?: 'sm' | 'md' | 'lg'
    width?: string
    editable?: boolean
    onLastRowInView?: () => void
    loading?: boolean
    groupBy?: string
    fetchMore?: () => void
    type?: string
    pagination?: {
        totalPages: number
        currentPage: number
        nextPage: () => void
        prevPage: () => void
        goToPage: (page: number) => void
        hasNextPage: boolean
        hasPrevPage: boolean
    }
    children?: React.ReactNode
    shadow?: boolean
    background?: 'full' | 'header' | 'none'
    fadeHorizontal?: boolean
}

const Pagination = ({
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
}: {
    currentPage: number
    totalPages: number
    goToPage: (page: number) => void
    nextPage: () => void
    prevPage: () => void
    hasNextPage: boolean
    hasPrevPage: boolean
}) => {
    return (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-t border-slate-800 text-slate-300 text-xs font-medium">
            <div className="flex items-center space-x-2">
                <span>Sayfa {currentPage + 1} / {Math.max(1, totalPages)}</span>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    disabled={!hasPrevPage}
                    onClick={prevPage}
                    className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
                >
                    Önceki
                </button>
                <button
                    disabled={!hasNextPage}
                    onClick={nextPage}
                    className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
                >
                    Sonraki
                </button>
            </div>
        </div>
    )
}

const RowComponent = ({
    row,
    lastRowRef,
    rowAlignment,
    columns,
    isLastRow = false,
}: {
    row: Row
    lastRowRef: any
    rowAlignment: 'top' | 'center'
    columns?: Column[]
    isLastRow?: boolean
}) => {
    return (
        <React.Fragment>
            {row.cells.map((cell, cellIndex) => {
                const isLastCell = cellIndex === row.cells.length - 1
                return (
                    <div
                        ref={lastRowRef}
                        key={cellIndex}
                        className={`p-3 bg-slate-900/40 hover:bg-slate-800/50 border-b border-slate-800/60 transition-colors ${
                            isLastCell ? '' : 'border-r border-slate-800/40'
                        } ${rowAlignment === 'center' ? 'flex items-center' : ''} ${
                            columns?.[cellIndex]?.align === 'right'
                                ? 'text-right'
                                : columns?.[cellIndex]?.align === 'center'
                                  ? 'text-center'
                                  : 'text-left'
                        } ${cell.className || ''}`}
                        style={cell.style}
                    >
                        {cell.content}
                    </div>
                )
            })}
        </React.Fragment>
    )
}

export default function OSTable({
    columns,
    rows,
    className = '',
    rowAlignment = 'center',
    size = 'md',
    width = 'full',
    editable = false,
    onLastRowInView,
    loading = false,
    groupBy,
    fetchMore,
    type = 'item',
    pagination,
    shadow = true,
    background = 'full',
    fadeHorizontal = true,
}: OSTableProps) {
    const gridClass = columns?.map((col) => col.width || '1fr').join(' ') || 'auto'
    const [lastRowRef, lastRowInView] = useInView({ threshold: 0.1 })

    useEffect(() => {
        if (lastRowInView) {
            onLastRowInView?.()
        }
    }, [lastRowInView])

    return (
        <div className={`w-full my-4 rounded-xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-md shadow-2xl overflow-hidden ${className}`}>
            <ScrollArea fullWidth fadeX={fadeHorizontal}>
                <div
                    className="w-full grid text-slate-200 text-sm font-sans"
                    style={{ gridTemplateColumns: gridClass }}
                >
                    {/* Header Row */}
                    {columns && columns.map((column, index) => (
                        <div
                            key={index}
                            className={`px-3 py-3 bg-slate-900/90 text-slate-400 font-semibold text-xs tracking-wider uppercase border-b border-slate-800 flex items-center ${
                                index === columns.length - 1 ? '' : 'border-r border-slate-800/40'
                            } ${
                                column.align === 'center'
                                    ? 'justify-center text-center'
                                    : column.align === 'right'
                                      ? 'justify-end text-right'
                                      : 'justify-start text-left'
                            } ${column.className || ''}`}
                        >
                            {column.name}
                        </div>
                    ))}

                    {/* Data Rows */}
                    {rows.map((row, rowIndex) => (
                        <RowComponent
                            key={row.key || rowIndex}
                            row={row}
                            lastRowRef={rowIndex === rows.length - 1 ? lastRowRef : null}
                            rowAlignment={rowAlignment}
                            columns={columns}
                            isLastRow={rowIndex === rows.length - 1}
                        />
                    ))}
                </div>
            </ScrollArea>

            {pagination && <Pagination {...pagination} />}
        </div>
    )
}
