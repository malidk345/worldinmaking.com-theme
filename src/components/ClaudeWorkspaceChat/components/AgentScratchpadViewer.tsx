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
    <div className="my-2 overflow-hidden rounded-sm border border-primary bg-primary text-primary">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-2.5 py-2 text-left text-sm font-semibold hover:bg-accent cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5 text-primary">
          <IconNotebook className="size-3.5 text-muted" />
          <span>Scratchpad</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 6px',
              border: '1px solid #1D4ED8',
              borderRadius: 4,
              background: 'rgba(29, 78, 216, 0.1)',
              color: '#1D4ED8',
              fontSize: 12,
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            {notes.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleOpenWindow}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs font-medium text-primary hover:bg-accent border border-primary cursor-pointer"
            title="Open scratchpad window"
          >
            <IconExternal className="size-3" />
            <span>Open</span>
          </button>
          <IconChevronDown className={`size-3.5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {isOpen && (
        <div className="border-t border-primary px-2.5 py-2 space-y-1.5 text-sm">
          {notes.map((note, index) => (
            <div key={index} className="rounded-sm border border-primary bg-accent p-2 text-sm leading-relaxed">
              <p className="m-0 whitespace-pre-wrap break-words text-primary">{note.content}</p>
              {note.source && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted">
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
