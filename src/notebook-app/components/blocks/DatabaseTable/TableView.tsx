import React from 'react'
import { TableContent } from '../../../types/blocks'
import { LemonTag } from '../../ui/LemonTag'

export const TableView: React.FC<{ content: TableContent }> = ({ content }) => {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <tr>
            {content.columns.map(col => (
              <th key={col.id} className="px-4 py-2 font-medium text-slate-500">{col.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.rows.map(row => (
            <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
              {content.columns.map(col => (
                <td key={col.id} className="px-4 py-2">
                  {col.type === 'select' ? (
                    <LemonTag>{row.cells[col.id]}</LemonTag>
                  ) : col.type === 'checkbox' ? (
                    <input type="checkbox" checked={!!row.cells[col.id]} readOnly className="rounded" />
                  ) : (
                    <span>{row.cells[col.id]}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
