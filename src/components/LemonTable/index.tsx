import React from 'react'
import './LemonTable.css'

export interface Column<T> {
    title?: React.ReactNode
    dataIndex?: keyof T | string
    key?: string
    width?: string | number
    render?: (value: any, record: T, index: number) => React.ReactNode
    align?: 'left' | 'center' | 'right'
    className?: string
    sorter?: (a: T, b: T) => number
}

export interface LemonTableProps<T> {
    columns: Column<T>[]
    dataSource: T[]
    rowKey?: keyof T | ((record: T) => string | number)
    className?: string
    embedded?: boolean
    stealth?: boolean
    size?: 'small' | 'middle'
    loading?: boolean
    emptyState?: React.ReactNode
    'data-attr'?: string
    pagination?: {
        currentPage: number
        totalPages: number
        nextPage: () => void
        prevPage: () => void
        hasNextPage: boolean
        hasPrevPage: boolean
        goToPage: (page: number) => void
    }
}

export function LemonTable<T>({
    columns,
    dataSource,
    rowKey,
    className = '',
    embedded = false,
    stealth = false,
    size,
    loading = false,
    emptyState = 'No entries matching your filters!',
    'data-attr': dataAttr,
    pagination,
}: LemonTableProps<T>) {
    const getRowKey = (record: T, idx: number): string | number => {
        if (typeof rowKey === 'function') {
            return rowKey(record)
        }
        if (rowKey && (record as any)[rowKey] !== undefined) {
            return String((record as any)[rowKey])
        }
        if ((record as any).id) return String((record as any).id)
        if ((record as any).key) return String((record as any).key)
        return idx
    }

    const tableClasses = [
        'LemonTable',
        size && size !== 'middle' && `LemonTable--${size}`,
        embedded && 'LemonTable--embedded',
        stealth && 'LemonTable--stealth',
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <div className="w-full my-4">
            <div className={tableClasses} data-attr={dataAttr || 'lemon-table'}>
                <div className="LemonTable__content">
                    <table>
                        <colgroup>
                            {columns.map((col, idx) => (
                                <col
                                    key={`col-${idx}`}
                                    style={{
                                        width: typeof col.width === 'number' ? `${col.width}px` : col.width,
                                    }}
                                />
                            ))}
                        </colgroup>
                        <thead>
                            <tr>
                                {columns.map((col, idx) => (
                                    <th key={idx} className={col.align ? `text-${col.align}` : undefined}>
                                        <div className="LemonTable__header-content">
                                            <div>{col.title}</div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.length} className="text-center py-8 opacity-60">
                                        Loading...
                                    </td>
                                </tr>
                            ) : dataSource.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="LemonTable__empty-state text-center py-8 opacity-75">
                                        {emptyState}
                                    </td>
                                </tr>
                            ) : (
                                dataSource.map((record, rIdx) => (
                                    <tr key={String(getRowKey(record, rIdx))}>
                                        {columns.map((col, cIdx) => {
                                            const val = col.dataIndex ? (record as any)[col.dataIndex] : undefined
                                            return (
                                                <td key={cIdx} className={col.align ? `text-${col.align}` : undefined}>
                                                    {col.render ? col.render(val, record, rIdx) : ((val as React.ReactNode) ?? '')}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {pagination && (
                <div className="flex items-center justify-between py-2 px-1 text-xs text-secondary opacity-80 mt-2">
                    <div>
                        Page {pagination.currentPage + 1} of {Math.max(1, pagination.totalPages)}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            disabled={!pagination.hasPrevPage}
                            onClick={pagination.prevPage}
                            className="px-2.5 py-1 rounded bg-accent hover:opacity-80 disabled:opacity-40 disabled:pointer-events-none transition-all font-medium text-xs text-primary"
                        >
                            Previous
                        </button>
                        <button
                            disabled={!pagination.hasNextPage}
                            onClick={pagination.nextPage}
                            className="px-2.5 py-1 rounded bg-accent hover:opacity-80 disabled:opacity-40 disabled:pointer-events-none transition-all font-medium text-xs text-primary"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LemonTable
