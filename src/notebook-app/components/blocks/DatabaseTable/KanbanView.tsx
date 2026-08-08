import React from 'react'
import { TableContent } from '../../../types/blocks'

export const KanbanView: React.FC<{ content: TableContent }> = ({ content }) => {
  const selectCol = content.columns.find(c => c.type === 'select')
  const groups = selectCol?.options || []

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {groups.map(group => {
        const items = content.rows.filter(r => r.cells[selectCol!.id] === group.name)
        return (
          <div key={group.id} className="flex-none w-64 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
            <h3 className="text-sm font-medium mb-3 text-slate-600 dark:text-slate-400">{group.name} <span className="ml-2 text-xs opacity-50">{items.length}</span></h3>
            <div className="flex flex-col gap-2">
              {items.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-800 p-3 rounded shadow-sm border border-slate-200 dark:border-slate-700 text-sm">
                  {Object.entries(item.cells).filter(([k]) => k !== selectCol!.id).map(([k, v]) => (
                    <div key={k}>{String(v)}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
