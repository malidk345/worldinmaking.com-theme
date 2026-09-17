import React, { useMemo, useState } from 'react'
import { ModelOption, ThinkingProcess, ToolTrace } from '../types'
import { toolActivityTitle, toolStatusLabel } from '../../../lib/bots/tools/labels'
import { scrubSecretMaterial } from '../../../lib/ai/scrub'
import {
  buildThinkingTimeline,
  type TimelineItem,
} from '../../../lib/bots/agent/timeline'
import { IconBrain, IconSearch, IconNotebook, IconCheckCircle, IconChevronRight, IconArrowRight } from '@posthog/icons'
import { Activity, ShimmeringContent, type ActivityStatus } from './activity/ActivityPrimitives'
import { PixelPause, pauseMoodFromTool } from './ThinkingBangDots'

function toActivityStatus(status: TimelineItem['status']): ActivityStatus {
  if (status === 'running') return 'in_progress'
  if (status === 'error') return 'failed'
  return 'completed'
}

const ICON = 'size-3.5'

function toolIcon(name?: string) {
  if (name === 'web_search' || name === 'search_site' || name === 'fetch_url' || name === 'academic_search' || name === 'verified_corpus_search') {
    return <IconSearch className={ICON} />
  }
  if (
    name === 'read_document' ||
    name === 'read_notebook' ||
    name === 'read_post' ||
    name === 'insert_notebook_block' ||
    name === 'rewrite_notebook_document' ||
    name === 'export_notebook' ||
    name === 'add_notebook_footnote'
  ) {
    return <IconNotebook className={ICON} />
  }
  return <IconArrowRight className={ICON} />
}

function LiveThoughtContent({ text }: { text: string }) {
  const scrollRef = React.useRef<HTMLSpanElement>(null)
  const userScrolledUp = React.useRef(false)
  const [scrollState, setScrollState] = React.useState({ up: false, down: false })

  const updateScroll = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const up = el.scrollTop > 4
    const down = el.scrollTop + el.clientHeight < el.scrollHeight - 4
    userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight >= 20
    setScrollState((prev) => (prev.up === up && prev.down === down ? prev : { up, down }))
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (!userScrolledUp.current) {
      el.scrollTop = el.scrollHeight
    }
    updateScroll()
  }, [text, updateScroll])

  const maskStyle = React.useMemo(() => {
    if (scrollState.up && scrollState.down) {
      const grad = 'linear-gradient(to bottom, transparent 0px, black 14px, black calc(100% - 14px), transparent 100%)'
      return { maskImage: grad, WebkitMaskImage: grad }
    }
    if (scrollState.up) {
      const grad = 'linear-gradient(to bottom, transparent 0px, black 14px, black 100%)'
      return { maskImage: grad, WebkitMaskImage: grad }
    }
    if (scrollState.down) {
      const grad = 'linear-gradient(to bottom, black 0px, black calc(100% - 14px), transparent 100%)'
      return { maskImage: grad, WebkitMaskImage: grad }
    }
    return undefined
  }, [scrollState.up, scrollState.down])

  return (
    <span
      ref={scrollRef}
      onScroll={updateScroll}
      style={maskStyle}
      className="block max-h-[82px] overflow-y-auto overscroll-contain pr-1 select-text transition-[mask-image] duration-150"
    >
      {text}
    </span>
  )
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
      title={isLive ? <LiveThoughtContent text={body} /> : collapsedThoughtTitle(durationSeconds)}
      status={isLive ? 'in_progress' : 'completed'}
      icon={<IconBrain className={ICON} />}
      animate={false}
      allowWrap={isLive}
      compactBody={isLive}
      substeps={isLive ? [] : [body]}
    />
  )
}

function ToolActivity({
  item,
  onActivate,
}: {
  item: TimelineItem
  onActivate?: (toolName: string, status: TimelineItem['status']) => void
}) {
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
  const clickable = Boolean(onActivate && item.toolName && !live)
  return (
    <div
      className={clickable ? 'cursor-pointer rounded-sm hover:bg-accent/60' : undefined}
      onClick={
        clickable
          ? (event) => {
              event.stopPropagation()
              onActivate?.(item.toolName || '', item.status)
            }
          : undefined
      }
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onActivate?.(item.toolName || '', item.status)
              }
            }
          : undefined
      }
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <Activity
        id={item.id}
        title={title}
        status={toActivityStatus(item.status)}
        icon={toolIcon(item.toolName)}
        animate={live}
        details={details}
      />
    </div>
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
  onToolActivate,
}: {
  item: TimelineItem
  isLive: boolean
  durationSeconds?: number
  onToolActivate?: (toolName: string, status: TimelineItem['status']) => void
}) {
  if (item.kind === 'node') return null
  if (item.kind === 'plan') return <PlanningActivity item={item} isLive={isLive} />
  if (item.kind === 'tool') return <ToolActivity item={item} onActivate={onToolActivate} />
  return <ReasoningActivity item={item} isLive={isLive} durationSeconds={durationSeconds} />
}

interface ThinkingBlockProps {
  thinking: ThinkingProcess
  toolTrace?: ToolTrace[]
  isLive?: boolean
  model?: ModelOption
  timestamp?: string
  onToolActivate?: (toolName: string, status: TimelineItem['status']) => void
  onStop?: () => void
}

const ThinkingBlockComponent: React.FC<ThinkingBlockProps> = ({
  thinking,
  toolTrace,
  isLive = false,
  onToolActivate,
  onStop,
}) => {
  const items = useMemo(
    () => buildThinkingTimeline(thinking?.steps || [], toolTrace).filter((item) => item.kind !== 'node'),
    [thinking?.steps, toolTrace]
  )
  const [toolsOpen, setToolsOpen] = useState(isLive)
  React.useEffect(() => {
    if (isLive) setToolsOpen(true)
  }, [isLive])
  const hasItems = items.length > 0
  const lastReasoningId = [...items].reverse().find((item) => item.kind === 'reasoning')?.id
  const toolItems = items.filter((item) => item.kind === 'tool')
  const restItems = items.filter((item) => item.kind !== 'tool')
  const collapseTools = !isLive && toolItems.length > 1
  const visible = collapseTools && !toolsOpen ? restItems : items
  const liveTool = [...items].reverse().find((item) => item.kind === 'tool' && item.status === 'running')
  const faceMood = pauseMoodFromTool(liveTool?.toolName, liveTool?.status)
  if (!hasItems && !isLive) return null

  return (
    <div className="wim-ask-thinking w-full max-w-full font-sans text-secondary space-y-1 mb-0">
      {isLive ? (
        <div className="flex items-center gap-1.5 w-full min-w-0 py-0.5">
          <PixelPause live mood={faceMood} onStop={onStop} />
        </div>
      ) : null}

      {hasItems && (
        <div className="flex flex-col gap-1 w-full min-w-0">
          {collapseTools ? (
            <button
              type="button"
              onClick={() => setToolsOpen((open) => !open)}
              className="flex w-fit items-center gap-1 rounded-sm px-0.5 text-left text-[12px] text-secondary hover:text-primary cursor-pointer"
            >
              {toolItems.length} tools · {toolsOpen ? 'hide' : 'open'}
            </button>
          ) : null}
          {visible.map((item) => (
            <TimelineRow
              key={item.id}
              item={item}
              isLive={isLive}
              durationSeconds={item.id === lastReasoningId ? thinking.durationSeconds : undefined}
              onToolActivate={onToolActivate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const ThinkingBlock = React.memo(ThinkingBlockComponent)