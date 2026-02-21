"use client"

import React, { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { groupBy as _groupBy } from 'lodash'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import ScrollArea from '../RadixUI/ScrollArea'
import OSButton from '../OSButton'
import Loading from 'components/Loading'

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
}

const RowSkeleton = () => {
    return (
        <div className="flex items-center justify-center mt-4">
            <Loading label="streaming data" />
        </div>
    )
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
    const getVisiblePages = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i)
        }
        const pages = new Set<number>()
        pages.add(0)
        pages.add(totalPages - 1)
        const start = Math.max(0, currentPage - 1)
        const end = Math.min(totalPages - 1, currentPage + 1)
        for (let i = start; i <= end; i++) pages.add(i)
        if (currentPage > 3 && currentPage < totalPages - 4) {
            pages.add(Math.floor(totalPages / 2))
        }
        return Array.from(pages).sort((a, b) => a - b)
    }

    const visiblePages = getVisiblePages()

    return (
        <div className="flex items-center justify-center gap-2 mt-6 mb-4">
            <OSButton onClick={prevPage} disabled={!hasPrevPage} size="sm">
                <ChevronLeft className="size-4" />
            </OSButton>
            {visiblePages.map((page, index) => {
                const prev = visiblePages[index - 1]
                const showGap = prev !== undefined && page - prev > 1
                return (
                    <React.Fragment key={page}>
                        {showGap && <span className="px-2 text-muted text-sm">...</span>}
                        <OSButton
                            onClick={() => goToPage(page)}
                            size="sm"
                            className={page === currentPage ? 'font-bold bg-accent' : ''}
                        >
                            {page + 1}
                        </OSButton>
                    </React.Fragment>
                )
            })}
            <OSButton onClick={nextPage} disabled={!hasNextPage} size="sm">
                <ChevronRight className="size-4" />
            </OSButton>
        </div>
    )
}

const RowComponent = ({
    row,
    lastRowRef,
    rowAlignment,
    columns,
    moreCount,
    onShowMore,
    type,
}: {
    row: Row
    lastRowRef: any
    rowAlignment: 'top' | 'center'
    columns?: Column[]
    moreCount?: number
    onShowMore?: () => void
    type?: string
}) => {
    return (
        <>
            {row.cells.map((cell, cellIndex) => (
                <div
                    ref={lastRowRef}
                    key={cellIndex}
                    className={`
                        relative
                        ${cellIndex === row.cells.length - 1 ? '!border-r' : ''}
                        flex flex-col 
                        ${rowAlignment === 'top' ? 'justify-start' : 'justify-center'} 
                        ${columns?.[cellIndex]?.align === 'left'
                            ? 'items-start'
                            : columns?.[cellIndex]?.align === 'right'
                                ? 'items-end'
                                : 'items-center text-center'
                        } ${cell.className || ''}`}
                    style={cell.style}
                >
                    {cell.content}
                </div>
            ))}
            {moreCount && moreCount > 0 ? (
                <div className="col-span-full text-center !py-0 !border-r border-primary bg-accent/30 hover:bg-accent/50 transition-colors">
                    <button
                        onClick={onShowMore}
                        className="text-primary hover:text-accent font-semibold text-[13px] w-full py-1.5"
                    >
                        Show {moreCount} more {moreCount === 1 ? type : `${type}s`}
                    </button>
                </div>
            ) : null}
        </>
    )
}

const GroupedRows = ({
    rows,
    lastRowRef,
    rowAlignment,
    columns,
    type,
}: {
    rows: Row[]
    lastRowRef: any
    rowAlignment: 'top' | 'center'
    columns?: Column[]
    type?: string
}) => {
    const [showMore, setShowMore] = useState(false)
    return (
        <>
            {(showMore ? rows : rows.slice(0, 1)).map((row, rowIndex) => (
                <RowComponent
                    key={rowIndex}
                    row={row}
                    lastRowRef={rowIndex === rows.length - 1 ? lastRowRef : null}
                    rowAlignment={rowAlignment}
                    columns={columns}
                    moreCount={showMore ? undefined : rows.length - 1}
                    onShowMore={() => setShowMore(true)}
                    type={type}
                />
            ))}
        </>
    )
}

const OSTable: React.FC<OSTableProps> = ({
    columns,
    rows,
    className = '',
    rowAlignment = 'center',
    size = 'md',
    width = 'auto',
    onLastRowInView,
    loading,
    groupBy,
    fetchMore,
    pagination,
    type = 'item',
}) => {
    const gridClass = columns?.map((col) => col.width || 'auto').join(' ') || ''
    const { ref: lastRowRef, inView: lastRowInView } = useInView({ threshold: 0.1 })

    useEffect(() => {
        if (lastRowInView) onLastRowInView?.()
    }, [lastRowInView, onLastRowInView])

    return (
        <div className={`OSTable mb-2 ${width === 'full' ? 'w-full' : 'max-w-full'}`}>
            <ScrollArea fullWidth>
                <div className="flex">
                    <div
                        className={`text-primary inline-grid divide-x divide-y divide-border border-b border-l border-primary text-[14px] bg-primary/50 ${width === 'full' ? 'w-full' : 'w-min'
                            } ${size === 'sm' ? '[&>div]:py-1 [&>div]:px-1.5' : size === 'md' ? '[&>div]:py-2 [&>div]:px-2.5' : '[&>div]:py-4 [&>div]:px-4'
                            } ${className}`}
                        style={{ gridTemplateColumns: gridClass, minWidth: width === 'full' ? '100%' : '42rem' }}
                    >
                        {columns && columns.map((column, index) => (
                            <div
                                key={index}
                                className={`text-xs border-l border-t border-primary bg-accent font-bold text-primary/70 py-1.5 ${index === columns.length - 1 ? '!border-r' : ''
                                    } ${column.align === 'center' ? 'text-center' : ''} ${column.className || ''}`}
                            >
                                {column.name}
                            </div>
                        ))}

                        {groupBy
                            ? Object.entries(
                                _groupBy(rows, (row) => {
                                    const idx = columns?.findIndex(c => c.name === groupBy)
                                    if (idx === undefined || idx === -1) return ''
                                    const content = row.cells[idx]?.content
                                    return React.isValidElement(content) ? (content as any).props?.children || '' : String(content)
                                })
                            ).map(([grp, value], index) => (
                                <GroupedRows
                                    key={index}
                                    rows={value}
                                    lastRowRef={lastRowRef}
                                    rowAlignment={rowAlignment}
                                    columns={columns}
                                    type={grp ? `${grp.toLowerCase()} ${type}` : type}
                                />
                            ))
                            : rows?.map((row, rowIndex) => (
                                <RowComponent
                                    key={row.key || rowIndex}
                                    row={row}
                                    lastRowRef={rowIndex === rows.length - 1 ? lastRowRef : null}
                                    rowAlignment={rowAlignment}
                                    columns={columns}
                                    type={type}
                                />
                            ))}
                    </div>
                </div>
                {loading && <RowSkeleton />}
                {pagination && (
                    <Pagination
                        {...pagination}
                    />
                )}
            </ScrollArea>
        </div>
    )
}

export default OSTable
