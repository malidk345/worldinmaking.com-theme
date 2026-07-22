import React from 'react';
import './LemonTable.css';

export interface Column<T> {
  title?: React.ReactNode;
  dataIndex?: keyof T;
  width?: string | number;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  sorter?: (a: T, b: T) => number;
}

export interface LemonTableProps<T> {
  columns: Column<T>[];
  dataSource: T[];
  rowKey?: keyof T | ((record: T) => string | number);
  className?: string;
  embedded?: boolean;
  stealth?: boolean;
  size?: 'small' | 'middle';
  loading?: boolean;
  emptyState?: React.ReactNode;
  'data-attr'?: string;
}

export function LemonTable<T extends Record<string, unknown>>({
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
}: LemonTableProps<T>) {
  const getRowKey = (record: T, idx: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    if (rowKey && record[rowKey as keyof T] !== undefined) {
      return String(record[rowKey as keyof T]);
    }
    if (record.id) return String(record.id);
    if (record.key) return String(record.key);
    return idx;
  };

  const tableClasses = [
    'LemonTable',
    size && size !== 'middle' && `LemonTable--${size}`,
    embedded && 'LemonTable--embedded',
    stealth && 'LemonTable--stealth',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={tableClasses} data-attr={dataAttr}>
      <div className="LemonTable__content">
        <table>
          <colgroup>
            {columns.map((col, idx) => (
              <col
                key={`col-${idx}`}
                style={{ width: col.width === 0 ? '1%' : col.width }}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={col.align ? `text-${col.align}` : undefined}
                >
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
                <td colSpan={columns.length} className="text-center py-8 text-[var(--muted-3000,#6b7280)]">
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
                    const val = col.dataIndex ? record[col.dataIndex] : undefined;
                    return (
                      <td
                        key={cIdx}
                        className={col.align ? `text-${col.align}` : undefined}
                      >
                        {col.render ? col.render(val, record, rIdx) : (val as React.ReactNode ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
