import React, { useState } from 'react'
import { TableContent } from '../../../types/blocks'
import { TableView } from './TableView'
import { KanbanView } from './KanbanView'
import { LemonButton } from '../../ui/LemonButton'

export const DatabaseTable: React.FC<{ content: TableContent }> = ({ content }) => {
  const [activeView, setActiveView] = useState(content.activeViewId || content.views[0]?.id)
  const view = content.views.find(v => v.id === activeView)

  return (
    <div className="my-4 flex flex-col gap-3">
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {content.views.map(v => (
          <LemonButton
            key={v.id}
            size="small"
            type={activeView === v.id ? 'primary' : 'secondary'}
            onClick={() => setActiveView(v.id)}
          >
            {v.name}
          </LemonButton>
        ))}
      </div>
      {view?.type === 'kanban' ? <KanbanView content={content} /> : <TableView content={content} />}
    </div>
  )
}
