import React, { useMemo, useState } from 'react'
import { ModelOption, ThinkingProcess, ToolTrace } from '../types'
import { toolActivityTitle, toolStatusLabel } from '../../../lib/bots/tools/labels'
import { scrubSecretMaterial } from '../../../lib/ai/scrub'
import {
  buildThinkingTimeline,
  type TimelineItem,
} from '../../../lib/bots/agent/timeline'
import dayjs from 'dayjs'
import { IconBrain, IconWrench, IconSearch, IconNotebook, IconCheckCircle, IconChevronRight } from '@posthog/icons'
import { Activity, ShimmeringContent, type ActivityStatus } from './activity/ActivityPrimitives'
import { ThinkingBangDots } from './ThinkingBangDots'

function philosopherSurname(name?: string): string {
  if (!name) return 'AI'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts[parts.length - 1] || name
}

function formatExactTime(ts?: string): string {
  if (!ts) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  const trimmed = ts.trim()
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed
  const d = dayjs(trimmed)
  if (d.isValid()) return d.format('HH:mm')
  return trimmed
}

function toActivityStatus(status: TimelineItem['status']): ActivityStatus {
  if (status === 'running') return 'in_progress'
  if (status === 'error') return 'failed'
  return 'completed'
}

const ICON = 'size-3.5'

function toolIcon(name?: string) {
  if (name === 'web_search' || name === 'search_site' || name === 'fetch_url') return <IconSearch className={ICON} />
  if (name === 'read_document' || name === 'read_notebook' || name === 'read_post') return <IconNotebook className={ICON} />
  return <IconWrench className={ICON} />
}

function ReasoningActivity({
  item,
  isLive,
  durationSeconds,
}: {
  item: TimelineItem
  isLive: boolean
  durationSeconds?: number
}) {
  const body = scrubSecretMaterial((item.detail || item.title || '').trim())
  if (!body) return null
  return (
    <Activity
      id={item.id}
      title={isLive ? body : collapsedThoughtTitle(durationSeconds)}
      status={isLive ? 'in_progress' : 'completed'}
      icon={<IconBrain className={ICON} />}
      animate={false}
      allowWrap={isLive}
      compactBody={isLive}
      substeps={isLive ? [] : [body]}
    />
  )
}

function ToolActivity({ item }: { item: TimelineItem }) {
  const live = item.status === 'running'
  const status = live ? 'running' : item.status === 'error' ? 'error' : 'done'
  const labeled = item.toolName ? toolActivityTitle(item.toolName, status, item.args) : ''
  const rawTitle = live
    ? labeled || item.title || 'Tool'
    : item.title || labeled || (item.toolName ? toolStatusLabel(item.toolName, status) : 'Tool')
  const title = scrubSecretMaterial(rawTitle)
  const rawExtra = item.detail && item.detail !== rawTitle && item.detail !== labeled ? item.detail : undefined
  const extra = rawExtra ? scrubSecretMaterial(rawExtra) : undefined
  const details = extra ? (
      <p className="m-0 text-[11.5px] leading-[1.4] tracking-tight text-muted">{extra}</p>
    ) : null
  return (
    <Activity
      id={item.id}
      title={title}
      status={toActivityStatus(item.status)}
      icon={toolIcon(item.toolName)}
      animate={live}
      details={details}
    />
  )
}

function PlanningActivity({ item, isLive }: { item: TimelineItem; isLive: boolean }) {
  const todos = item.todos || []
  const completed = todos.filter((todo) => todo.status === 'completed').length
  const live = isLive || item.status === 'running' || todos.some((todo) => todo.status === 'in_progress')
  const hasMultiple = todos.length > 1
  const [expanded, setExpanded] = useState(isLive)

  React.useEffect(() => {
    setExpanded(isLive)
  }, [isLive])

  return (
    <div
      className="flex flex-col text-[12px] leading-[18px] text-primary"
      style={{ animation: 'wim-activity-fade-in 150ms cubic-bezier(0.215, 0.61, 0.355, 1) both' }}
    >
      <div
        className={`flex items-center gap-1 select-none min-h-[18px] ${hasMultiple ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={hasMultiple ? () => setExpanded((open) => !open) : undefined}
      >
        <span className="flex size-[18px] items-center justify-center shrink-0 text-secondary [&_svg]:size-3.5">
          {live ? (
            <ShimmeringContent>
              <IconNotebook className={ICON} />
            </ShimmeringContent>
          ) : (
            <IconNotebook className={ICON} />
          )}
        </span>
        <div className="flex min-h-[18px] items-center gap-1 flex-1 min-w-0 leading-[18px]">
          {live ? <ShimmeringContent>Planning</ShimmeringContent> : <span className="leading-[18px]">Planning</span>}
          {todos.length > 0 && (
            <span className="text-muted">
              ({completed}/{todos.length})
            </span>
          )}
          {hasMultiple && (
            <span className={`inline-flex text-muted transition-transform ${expanded ? 'rotate-90' : ''}`}>
              <IconChevronRight className="size-3" />
            </span>
          )}
        </div>
      </div>
      {expanded && todos.length > 0 && (
        <div className="mt-1 space-y-1 border-l-2 border-primary ml-2 pl-3">
          {todos.map((todo) => {
            const done = todo.status === 'completed'
            const active = todo.status === 'in_progress'
            return (
              <div
                key={todo.id}
                className="flex items-start gap-2"
                style={{ animation: 'wim-activity-fade-in 150ms cubic-bezier(0.215, 0.61, 0.355, 1) both' }}
              >
                <span
                  className={`mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border border-primary ${
                    done ? 'bg-accent' : 'bg-primary'
                  }`}
                >
                  {done ? <IconCheckCircle className="size-2.5 text-secondary" /> : null}
                </span>
                <span className={`leading-[18px] ${done ? 'text-muted line-through' : active ? 'font-medium text-primary' : 'text-secondary'}`}>
                  {todo.title}
                  {active && (
                    <span className="ml-1 text-muted">
                      <ShimmeringContent>(in progress)</ShimmeringContent>
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function collapsedThoughtTitle(durationSeconds?: number): string {
  const seconds = Math.round(Number(durationSeconds) || 0)
  return seconds >= 1 ? `Thought · ${seconds}s` : 'Thought'
}

function TimelineRow({
  item,
  isLive,
  durationSeconds,
}: {
  item: TimelineItem
  isLive: boolean
  durationSeconds?: number
}) {
  if (item.kind === 'node') return null
  if (item.kind === 'plan') return <PlanningActivity item={item} isLive={isLive} />
  if (item.kind === 'tool') return <ToolActivity item={item} />
  return <ReasoningActivity item={item} isLive={isLive} durationSeconds={durationSeconds} />
}

interface ThinkingBlockProps {
  thinking: ThinkingProcess
  toolTrace?: ToolTrace[]
  isLive?: boolean
  model?: ModelOption
  timestamp?: string
}

const ThinkingBlockComponent: React.FC<ThinkingBlockProps> = ({
  thinking,
  toolTrace,
  isLive = false,
  model,
  timestamp,
}) => {
  const items = useMemo(
    () => buildThinkingTimeline(thinking?.steps || [], toolTrace).filter((item) => item.kind !== 'node'),
    [thinking?.steps, toolTrace]
  )
  const hasItems = items.length > 0
  if (!model && !hasItems && !isLive) return null

  const surname = philosopherSurname(model?.name)
  const formattedTime = formatExactTime(timestamp)
  const lastReasoningId = [...items].reverse().find((item) => item.kind === 'reasoning')?.id

  return (
    <div className="wim-ask-thinking w-full max-w-full font-sans text-secondary space-y-1 mb-0">
      {(model || isLive) && (
        <div className="flex items-center gap-1.5 w-full min-w-0">
          {model && (
            <>
              <div className="size-6 shrink-0 rounded-full overflow-hidden border border-primary bg-accent">
                {model.avatarUrl ? (
                  <img src={model.avatarUrl} alt={surname} className="size-full object-cover object-top" />
                ) : (
                  <span className={`flex size-full items-center justify-center text-[10px] font-bold text-white ${model.avatarBg || 'bg-[#1E3A8A]'}`}>
                    {model.initials || surname.slice(0, 2)}
                  </span>
                )}
              </div>
              <strong className="font-semibold text-[13px] text-primary leading-none">{surname}</strong>
              <span className="text-[11px] text-muted leading-none" suppressHydrationWarning>
                {formattedTime}
              </span>
            </>
          )}
          {isLive && (
            <span className="ml-auto shrink-0 flex items-center">
              <ThinkingBangDots />
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 w-full min-w-0">
        {items.map((item) => (
          <TimelineRow
            key={item.id}
            item={item}
            isLive={isLive}
            durationSeconds={item.id === lastReasoningId ? thinking.durationSeconds : undefined}
          />
        ))}
      </div>
    </div>
  )
}

export const ThinkingBlock = React.memo(ThinkingBlockComponent)