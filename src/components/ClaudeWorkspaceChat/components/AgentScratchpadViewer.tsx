import React, { useState } from 'react'
import { ToolTrace } from '../types'
import { IconNotebook, IconChevronDown, IconExternal, IconDocument } from '@posthog/icons'
import { useApp } from '../../../context/App'

interface AgentScratchpadViewerProps {
  toolTrace?: ToolTrace[]
}

interface ParsedNote {
  content: string
  source?: string
}

export const AgentScratchpadViewer: React.FC<AgentScratchpadViewerProps> = ({ toolTrace }) => {
  const [isOpen, setIsOpen] = useState(true)
  const { addWindow } = useApp()

  if (!toolTrace || toolTrace.length === 0) return null

  const notes: ParsedNote[] = []

  for (const trace of toolTrace) {
    if (trace.name === 'write_scratchpad' || trace.name === 'scratchpad' || trace.name === 'take_notes') {
      try {
        const parsed = JSON.parse(trace.arguments || '{}')
        if (parsed.content || parsed.note) {
          notes.push({
            content: parsed.content || parsed.note,
            source: parsed.source || trace.detail,
          })
        }
      } catch {
        if (trace.detail) notes.push({ content: trace.detail })
      }
    }
  }

  if (notes.length === 0) return null

  const handleOpenWindow = (event: React.MouseEvent) => {
    event.stopPropagation()
    addWindow({ path: '/scratchpad', title: 'Scratchpad' })
  }

  return (
    <div className="my-2 overflow-hidden rounded-md border border-primary bg-accent/40 text-primary">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold hover:bg-accent cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5 text-primary">
          <IconNotebook className="size-3.5 text-secondary" />
          <span>Scratchpad</span>
          <span className="text-muted font-medium">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenWindow}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-secondary hover:bg-primary border border-primary cursor-pointer"
            title="Open scratchpad window"
          >
            <IconExternal className="size-3" />
            <span>Open</span>
          </button>
          <IconChevronDown className={`size-3.5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {isOpen && (
        <div className="border-t border-primary px-3 py-2.5 space-y-1.5 text-xs">
          {notes.map((note, index) => (
            <div key={index} className="rounded border border-primary bg-primary p-2 text-[12px] leading-relaxed">
              <p className="m-0 whitespace-pre-wrap break-words text-primary">{note.content}</p>
              {note.source && (
                <div className="mt-1 flex items-center gap-1 text-[10.5px] font-medium text-muted">
                  <IconDocument className="size-3 shrink-0" />
                  <span>{note.source}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
