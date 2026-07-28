import React from 'react'

export interface LemonTableColumn<T> {
    title: React.ReactNode
    dataIndex?: keyof T | string
    key?: string
    align?: 'left' | 'center' | 'right'
    width?: string | number
    render?: (value: any, record: T, index: number) => React.ReactNode
}

export interface LemonTableProps<T> {
    columns: LemonTableColumn<T>[]
    dataSource: T[]
    loading?: boolean
    className?: string
    emptyText?: React.ReactNode
    onRowClick?: (record: T) => void
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

export function LemonTable<T extends Record<string, any>>({
    columns,
    dataSource,
    loading = false,
    className = '',
    emptyText = 'No data',
    onRowClick,
    pagination,
}: LemonTableProps<T>): JSX.Element {
    return (
        <div className={`LemonTable relative w-full overflow-x-auto ${className}`}>
            {loading && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden z-20">
                    <div className="w-full h-full bg-primary animate-pulse" />
                </div>
            )}
            <table className="w-full text-left border-collapse font-sans text-xs sm:text-sm">
                <thead>
                    <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-muted/70">
                        {columns.map((col, idx) => (
                            <th
                                key={col.key || String(col.dataIndex) || idx}
                                style={{ width: col.width }}
                                className={`py-2 px-3 select-none ${
                                    col.align === 'center'
                                        ? 'text-center'
                                        : col.align === 'right'
                                        ? 'text-right'
                                        : 'text-left'
                                }`}
                            >
                                {col.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {dataSource.length === 0 && !loading && (
                        <tr>
                            <td colSpan={columns.length} className="py-8 px-3 text-center text-muted text-xs">
                                {emptyText}
                            </td>
                        </tr>
                    )}
                    {dataSource.map((row, rIdx) => (
                        <tr
                            key={row.id || rIdx}
                            onClick={() => onRowClick?.(row)}
                            className={`hover:bg-accent/40 transition-colors ${
                                onRowClick ? 'cursor-pointer' : ''
                            }`}
                        >
                            {columns.map((col, cIdx) => {
                                const val = col.dataIndex ? row[col.dataIndex as string] : undefined
                                return (
                                    <td
                                        key={col.key || cIdx}
                                        className={`py-2.5 px-3 align-middle text-primary text-xs ${
                                            col.align === 'center'
                                                ? 'text-center'
                                                : col.align === 'right'
                                                ? 'text-right'
                                                : 'text-left'
                                        }`}
                                    >
                                        {col.render ? col.render(val, row, rIdx) : String(val ?? '')}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {pagination && (
                <div className="flex items-center justify-between py-3 px-1 border-t border-black/10 dark:border-white/10 text-xs text-muted mt-2">
                    <span>
                        Page {pagination.currentPage + 1} of {Math.max(1, pagination.totalPages)}
                    </span>
                    <div className="flex items-center space-x-2">
                        <button
                            disabled={!pagination.hasPrevPage}
                            onClick={pagination.prevPage}
                            className="px-2 py-1 rounded bg-accent/60 hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-all font-medium text-xs text-primary"
                        >
                            Previous
                        </button>
                        <button
                            disabled={!pagination.hasNextPage}
                            onClick={pagination.nextPage}
                            className="px-2 py-1 rounded bg-accent/60 hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-all font-medium text-xs text-primary"
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
