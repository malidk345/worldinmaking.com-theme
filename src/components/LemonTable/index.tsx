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
    emptyText = 'No data available',
    onRowClick,
    pagination,
}: LemonTableProps<T>): JSX.Element {
    return (
        <div className={`LemonTable__wrapper w-full my-4 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-primary/40 shadow-xs ${className}`}>
            {loading && (
                <div className="LemonTable__loader w-full h-0.5 bg-accent relative overflow-hidden">
                    <div className="w-full h-full bg-primary animate-pulse" />
                </div>
            )}
            <div className="LemonTable__content w-full overflow-x-auto">
                <table className="LemonTable w-full text-left border-collapse font-sans text-xs sm:text-sm">
                    <thead>
                        <tr className="LemonTable__header-row border-b border-black/10 dark:border-white/10 bg-black/4 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-secondary">
                            {columns.map((col, idx) => (
                                <th
                                    key={col.key || String(col.dataIndex) || idx}
                                    style={{ width: col.width }}
                                    className={`LemonTable__header px-3.5 py-2.5 font-bold uppercase text-[11px] tracking-wider text-secondary select-none ${
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
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted text-xs">
                                    <div className="LemonTable__empty-state">{emptyText}</div>
                                </td>
                            </tr>
                        )}
                        {dataSource.map((row, rIdx) => (
                            <tr
                                key={row.id || rIdx}
                                onClick={() => onRowClick?.(row)}
                                className={`LemonTable__row hover:bg-black/3 dark:hover:bg-white/4 transition-colors ${
                                    onRowClick ? 'cursor-pointer' : ''
                                }`}
                            >
                                {columns.map((col, cIdx) => {
                                    const val = col.dataIndex ? row[col.dataIndex as string] : undefined
                                    return (
                                        <td
                                            key={col.key || cIdx}
                                            className={`px-3.5 py-3 align-middle text-primary ${
                                                col.align === 'center'
                                                    ? 'text-center'
                                                    : col.align === 'right'
                                                    ? 'text-right'
                                                    : 'text-left'
                                            }`}
                                        >
                                            {col.render ? col.render(val, row, rIdx) : String(val ?? '')}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination && (
                <div className="LemonTable__pagination flex items-center justify-between px-3.5 py-2.5 bg-black/3 dark:bg-white/5 border-t border-black/10 dark:border-white/10 text-xs font-medium text-secondary">
                    <div>
                        Page {pagination.currentPage + 1} of {Math.max(1, pagination.totalPages)}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            disabled={!pagination.hasPrevPage}
                            onClick={pagination.prevPage}
                            className="px-2.5 py-1 rounded bg-accent hover:opacity-80 disabled:opacity-40 disabled:pointer-events-none transition-all font-medium text-xs"
                        >
                            Prev
                        </button>
                        <button
                            disabled={!pagination.hasNextPage}
                            onClick={pagination.nextPage}
                            className="px-2.5 py-1 rounded bg-accent hover:opacity-80 disabled:opacity-40 disabled:pointer-events-none transition-all font-medium text-xs"
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
