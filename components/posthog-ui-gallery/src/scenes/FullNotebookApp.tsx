import React, { useState } from 'react'
import {
  LemonButton,
  LemonInput,
  LemonTag,
  LemonBadge,
  LemonDivider,
  LemonCheckbox,
  ProfilePicture,
  LemonTextArea,
} from '../components/lemon-ui'
import {
  IconSearch,
  IconGear,
  IconPlus,
  IconTrash,
  IconCopy,
  IconLink,
  IconNotebook,
  IconExternal,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
} from '../components/icons'

export type BlockType =
  | 'h1'
  | 'h2'
  | 'paragraph'
  | 'code'
  | 'query'
  | 'checklist'
  | 'comment'
  | 'recording'

export interface NotebookBlock {
  id: string
  type: BlockType
  content: string
  codeLanguage?: string
  checked?: boolean
  queryOutput?: { label: string; value: number; percentage: string }[]
  commentReplies?: { id: string; author: string; avatar: string; text: string; time: string }[]
  recordingData?: { user: string; duration: string; timestamp: string; eventsCount: number }
}

export interface FullNotebookAppProps {
  onBack?: () => void
  initialTitle?: string
}

export function FullNotebookApp({
  onBack,
  initialTitle = 'User Onboarding Funnel & Conversion Analysis',
}: FullNotebookAppProps): JSX.Element {
  const [title, setTitle] = useState(initialTitle)
  const [activeSlashBlockId, setActiveSlashBlockId] = useState<string | null>(null)
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [newCommentText, setNewCommentText] = useState('')

  // Canonical PostHog 3000 Notebook State Model
  const [blocks, setBlocks] = useState<NotebookBlock[]>([
    {
      id: 'b-1',
      type: 'h1',
      content: 'Q3 Onboarding Funnel & Conversion Drop Investigation',
    },
    {
      id: 'b-2',
      type: 'paragraph',
      content:
        'During the deployment of PR #4821, we observed a **14.2% dropoff** on Step 3 (Payment Verification) for EU pod workspace users. Below is the active query breakdown, SQL debug script, and remediation checklist.',
    },
    {
      id: 'b-3',
      type: 'query',
      content: 'SELECT step_name, count(distinct person_id) FROM events WHERE event = "checkout_step" GROUP BY step_name ORDER BY count DESC',
      queryOutput: [
        { label: '1. Cart View', value: 14200, percentage: '100%' },
        { label: '2. Shipping Address', value: 11400, percentage: '80.2%' },
        { label: '3. Payment Input', value: 8900, percentage: '62.6%' },
        { label: '4. Order Complete', value: 8100, percentage: '57.0%' },
      ],
    },
    {
      id: 'b-4',
      type: 'h2',
      content: 'HogQL Event Aggregation & Debug Query',
    },
    {
      id: 'b-5',
      type: 'code',
      content: `-- HogQL Event Breakdown Query\nSELECT \n  properties.$current_url as url,\n  count() as pageviews\nFROM events\nWHERE event = '$pageview'\nGROUP BY url\nORDER BY pageviews DESC\nLIMIT 5`,
      codeLanguage: 'hogql',
    },
    {
      id: 'b-6',
      type: 'comment',
      content: 'Anchored on Step 3 Payment Verification Dropoff',
      commentReplies: [
        { id: 'cr-1', author: 'James Green', avatar: 'JG', text: 'SeaweedFS gRPC payload limit might be hit during high-throughput activity spikes.', time: '2 hours ago' },
        { id: 'cr-2', author: 'Alex Smith', avatar: 'AS', text: 'Investigating Temporal worker execution logs on prod-eu right now.', time: '1 hour ago' },
      ],
    },
    {
      id: 'b-7',
      type: 'recording',
      content: 'User Session #8942 Dropoff at Payment Step',
      recordingData: {
        user: 'paul@posthog.com',
        duration: '04m 12s',
        timestamp: 'Today at 14:22',
        eventsCount: 42,
      },
    },
    {
      id: 'b-8',
      type: 'checklist',
      content: 'Deploy hotfix PR #4822 to store large Temporal activity payloads by reference to SeaweedFS',
      checked: true,
    },
    {
      id: 'b-9',
      type: 'checklist',
      content: 'Verify ClickHouse precompute query cache performance on prod-us and prod-eu clusters',
      checked: false,
    },
  ])

  // Block Handlers
  const handleUpdateBlockContent = (id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)))
  }

  const handleToggleChecklist = (id: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, checked: !b.checked } : b)))
  }

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const handleAddReplyToComment = (blockId: string, text: string) => {
    if (!text.trim()) return
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === blockId) {
          const updatedReplies = [
            ...(b.commentReplies || []),
            { id: `cr-${Date.now()}`, author: "You (Paul D'Amora)", avatar: 'PD', text: text.trim(), time: 'Just now' },
          ]
          return { ...b, commentReplies: updatedReplies }
        }
        return b
      })
    )
  }

  const handleAddBlock = (targetId: string, newType: BlockType) => {
    const newBlock: NotebookBlock = {
      id: `b-${Date.now()}`,
      type: newType,
      content:
        newType === 'h1'
          ? 'New Section Heading'
          : newType === 'h2'
          ? 'New Subheading'
          : newType === 'code'
          ? 'SELECT count() FROM events WHERE event = "$pageview"'
          : newType === 'checklist'
          ? 'New task item'
          : newType === 'query'
          ? 'SELECT event, count() FROM events GROUP BY event'
          : newType === 'recording'
          ? 'Session Recording #9910'
          : 'New paragraph text...',
      checked: false,
      queryOutput:
        newType === 'query'
          ? [
              { label: 'Step 1', value: 1000, percentage: '100%' },
              { label: 'Step 2', value: 650, percentage: '65%' },
            ]
          : undefined,
      recordingData:
        newType === 'recording'
          ? { user: 'dev@posthog.com', duration: '02m 15s', timestamp: 'Just now', eventsCount: 18 }
          : undefined,
    }

    const idx = blocks.findIndex((b) => b.id === targetId)
    if (idx !== -1) {
      const nextBlocks = [...blocks]
      nextBlocks.splice(idx + 1, 0, newBlock)
      setBlocks(nextBlocks)
    } else {
      setBlocks([...blocks, newBlock])
    }
    setActiveSlashBlockId(null)
  }

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= blocks.length) return
    const updated = [...blocks]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    setBlocks(updated)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-3000)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-3000)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top Header Toolbar ────────────────────────────────────── */}
      <header
        className="posthog-glass"
        style={{
          padding: '0.625rem 1.25rem',
          borderBottom: '1px solid var(--border-3000)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBack && (
            <LemonButton size="small" type="tertiary" onClick={onBack}>
              ← Back
            </LemonButton>
          )}
          <LemonDivider vertical style={{ height: '1.25rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconNotebook style={{ fontSize: '1.125rem', color: 'var(--color-accent, #1d4ed8)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Notebooks /
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'var(--font-title)' }}>
              {title}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ProfilePicture name="Paul D'Amora" email="paul@posthog.com" size="xs" showName />
          <LemonButton size="small" type="secondary" onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}>
            📜 History ({blocks.length})
          </LemonButton>
          <LemonButton size="small" type="primary" onClick={() => setShowShareModal(true)}>
            Share
          </LemonButton>
        </div>
      </header>

      {/* ── Main Canvas View ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Core Notebook Workspace */}
        <main style={{ flex: 1, padding: '2.5rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ maxWidth: '840px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Editable Notebook Title Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '2.25rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-title)',
                  letterSpacing: '-0.02em',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-3000)',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                <LemonTag type="highlight">PostHog 3000 Notebook</LemonTag>
                <span>•</span>
                <span>Edited 10m ago</span>
                <span>•</span>
                <span>Hover left gutter to add or move blocks</span>
              </div>
            </div>

            {/* Render Block Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {blocks.map((block, index) => (
                <NotebookBlockRow
                  key={block.id}
                  block={block}
                  index={index}
                  totalBlocks={blocks.length}
                  activeSlashBlockId={activeSlashBlockId}
                  onUpdateContent={(content) => handleUpdateBlockContent(block.id, content)}
                  onToggleChecklist={() => handleToggleChecklist(block.id)}
                  onDeleteBlock={() => handleDeleteBlock(block.id)}
                  onMoveBlock={(dir) => handleMoveBlock(index, dir)}
                  onOpenSlashMenu={() => setActiveSlashBlockId(activeSlashBlockId === block.id ? null : block.id)}
                  onAddBlock={(type) => handleAddBlock(block.id, type)}
                  onAddReply={(replyText) => handleAddReplyToComment(block.id, replyText)}
                />
              ))}
            </div>

          </div>
        </main>

        {/* Optional Right Version History Drawer */}
        {showHistoryDrawer && (
          <aside
            className="posthog-glass-panel"
            style={{
              width: '320px',
              borderLeft: '1px solid var(--border-3000)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem' }}>Version History</h3>
              <LemonButton size="xsmall" type="tertiary" onClick={() => setShowHistoryDrawer(false)}>
                ✕
              </LemonButton>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-surface-primary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-3000)' }}>
                <div style={{ fontWeight: 600 }}>Current Draft</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Edited by Paul D&apos;Amora • Just now</div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-surface-primary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-3000)' }}>
                <div style={{ fontWeight: 600 }}>Added Query &amp; Session Recording Node</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Edited by James Green • 2 hours ago</div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            className="posthog-glass"
            style={{
              width: '420px',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Share Notebook</h3>
              <LemonButton size="xsmall" type="tertiary" onClick={() => setShowShareModal(false)}>
                ✕
              </LemonButton>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Anyone in your PostHog team can view and edit this notebook.
            </p>
            <LemonInput value={`https://app.posthog.com/notebooks/nb-${Date.now()}`} readOnly />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <LemonButton type="secondary" onClick={() => setShowShareModal(false)}>
                Close
              </LemonButton>
              <LemonButton type="primary" onClick={() => { alert('Link copied to clipboard!'); setShowShareModal(false); }}>
                Copy Link
              </LemonButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

{/* ── Subcomponent: Interactive Notebook Block Row with Gutter Controls ── */}
function NotebookBlockRow({
  block,
  index,
  totalBlocks,
  activeSlashBlockId,
  onUpdateContent,
  onToggleChecklist,
  onDeleteBlock,
  onMoveBlock,
  onOpenSlashMenu,
  onAddBlock,
  onAddReply,
}: {
  block: NotebookBlock
  index: number
  totalBlocks: number
  activeSlashBlockId: string | null
  onUpdateContent: (val: string) => void
  onToggleChecklist: () => void
  onDeleteBlock: () => void
  onMoveBlock: (dir: 'up' | 'down') => void
  onOpenSlashMenu: () => void
  onAddBlock: (type: BlockType) => void
  onAddReply: (text: string) => void
}): JSX.Element {
  const [isHovered, setIsHovered] = useState(false)
  const [replyInput, setReplyInput] = useState('')
  const isSlashOpen = activeSlashBlockId === block.id

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        padding: '0.25rem 0',
      }}
    >
      {/* Gutter Drag & Action Controls */}
      <div
        style={{
          width: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.125rem',
          opacity: isHovered || isSlashOpen ? 1 : 0,
          transition: 'opacity 150ms ease',
          paddingTop: '0.25rem',
        }}
      >
        <LemonButton size="xsmall" type="tertiary" onClick={() => onMoveBlock('up')} disabled={index === 0} title="Move up">
          ▲
        </LemonButton>
        <LemonButton size="xsmall" type="tertiary" onClick={() => onMoveBlock('down')} disabled={index === totalBlocks - 1} title="Move down">
          ▼
        </LemonButton>
        <LemonButton size="xsmall" type="tertiary" onClick={onOpenSlashMenu} title="Add block (+)">
          +
        </LemonButton>
        <LemonButton size="xsmall" type="tertiary" onClick={onDeleteBlock} title="Delete block">
          🗑
        </LemonButton>
      </div>

      {/* Main Block Content */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>

        {/* Heading 1 */}
        {block.type === 'h1' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', opacity: 0.5 }}>#</span>
            <input
              type="text"
              value={block.content}
              onChange={(e) => onUpdateContent(e.target.value)}
              style={{
                width: '100%',
                fontSize: '1.625rem',
                fontWeight: 800,
                fontFamily: 'var(--font-title)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-3000)',
              }}
            />
          </div>
        )}

        {/* Heading 2 */}
        {block.type === 'h2' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', opacity: 0.5 }}>##</span>
            <input
              type="text"
              value={block.content}
              onChange={(e) => onUpdateContent(e.target.value)}
              style={{
                width: '100%',
                fontSize: '1.25rem',
                fontWeight: 700,
                fontFamily: 'var(--font-title)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-3000)',
              }}
            />
          </div>
        )}

        {/* Paragraph */}
        {block.type === 'paragraph' && (
          <LemonTextArea
            value={block.content}
            onChange={onUpdateContent}
            rows={2}
          />
        )}

        {/* Code Block */}
        {block.type === 'code' && (
          <div
            className="posthog-glass"
            style={{
              borderRadius: 'var(--radius)',
              padding: '0.75rem',
              border: '1px solid var(--border-3000)',
              backgroundColor: '#18181b',
              color: '#f4f4f5',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
              <span>⚡ HogQL SQL Code Node</span>
              <span>SQL</span>
            </div>
            <textarea
              value={block.content}
              onChange={(e) => onUpdateContent(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#38bdf8',
                resize: 'vertical',
              }}
            />
          </div>
        )}

        {/* Query & Chart Visualization Node */}
        {block.type === 'query' && (
          <div
            className="posthog-glass"
            style={{
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              border: '1px solid var(--border-3000)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              backgroundColor: 'rgba(255,255,255,0.85)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>📊 Interactive Funnel Breakdown</div>
              <LemonTag type="highlight">Trends Visualization</LemonTag>
            </div>
            <LemonTextArea value={block.content} onChange={onUpdateContent} rows={2} />
            {block.queryOutput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {block.queryOutput.map((cd) => (
                  <div key={cd.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>{cd.label}</span>
                      <strong>{cd.value.toLocaleString()} ({cd.percentage})</strong>
                    </div>
                    <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: cd.percentage,
                          backgroundColor: 'var(--color-accent, #1d4ed8)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Session Recording Embed Block */}
        {block.type === 'recording' && block.recordingData && (
          <div
            className="posthog-glass"
            style={{
              borderRadius: 'var(--radius-lg)',
              padding: '0.875rem 1.125rem',
              border: '1px solid var(--border-3000)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255,255,255,0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ fontSize: '1.25rem' }}>▶️</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{block.content}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  User: {block.recordingData.user} • Duration: {block.recordingData.duration} • {block.recordingData.eventsCount} events
                </div>
              </div>
            </div>
            <LemonButton size="small" type="secondary">
              Play Session →
            </LemonButton>
          </div>
        )}

        {/* Checklist Item */}
        {block.type === 'checklist' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LemonCheckbox checked={!!block.checked} onChange={onToggleChecklist} />
            <input
              type="text"
              value={block.content}
              onChange={(e) => onUpdateContent(e.target.value)}
              style={{
                flex: 1,
                fontSize: '0.875rem',
                textDecoration: block.checked ? 'line-through' : 'none',
                color: block.checked ? 'var(--color-text-secondary)' : 'var(--text-3000)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Inline Discussion Comment Block */}
        {block.type === 'comment' && (
          <div
            className="posthog-glass"
            style={{
              borderRadius: 'var(--radius-lg)',
              padding: '0.875rem 1.125rem',
              border: '1px solid var(--border-3000)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
              backgroundColor: 'rgba(255,255,255,0.85)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-accent, #1d4ed8)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>💬</span>
              <span>Inline Discussion Thread</span>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{block.content}</div>

            {/* Replies */}
            {block.commentReplies?.map((cr) => (
              <div key={cr.id} style={{ paddingLeft: '0.75rem', borderLeft: '2px solid var(--border-3000)', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-3000)' }}>
                  {cr.author} • <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>{cr.time}</span>
                </div>
                <div style={{ color: 'var(--text-3000)' }}>{cr.text}</div>
              </div>
            ))}

            {/* Add Reply Input */}
            <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
              <input
                type="text"
                placeholder="Write a reply..."
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onAddReply(replyInput)
                    setReplyInput('')
                  }
                }}
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  padding: '0.375rem 0.625rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-3000)',
                  background: 'rgba(255,255,255,0.9)',
                  outline: 'none',
                }}
              />
              <LemonButton
                size="xsmall"
                type="primary"
                onClick={() => {
                  onAddReply(replyInput)
                  setReplyInput('')
                }}
              >
                Reply
              </LemonButton>
            </div>
          </div>
        )}

        {/* Slash Command Add Menu Popover */}
        {isSlashOpen && (
          <div
            className="posthog-glass"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 500,
              width: '260px',
              padding: '0.5rem',
              borderRadius: 'var(--radius)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              backgroundColor: 'rgba(255,255,255,0.95)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', padding: '0.25rem 0.5rem' }}>
              Insert Block Node
            </div>
            <LemonButton size="small" type="tertiary" onClick={() => onAddBlock('paragraph')}>
              📝 Paragraph Text
            </LemonButton>
            <LemonButton size="small" type="tertiary" onClick={() => onAddBlock('h1')}>
              # Heading 1
            </LemonButton>
            <LemonButton size="small" type="tertiary" onClick={() => onAddBlock('h2')}>
              ## Heading 2
            </LemonButton>
            <LemonButton size="small" type="tertiary" onClick={() => onAddBlock('query')}>
              📊 Trends Query Viz
            </LemonButton>
            <LemonButton size="small" type="tertiary" onClick={() => onAddBlock('code')}>
              💻 HogQL SQL Code
            </LemonButton>
            <LemonButton size="small" type="tertiary" onClick={() => onAddBlock('recording')}>
              ▶️ Session Recording
            </LemonButton>
            <LemonButton size="small" type="tertiary" onClick={() => onAddBlock('comment')}>
              💬 Inline Discussion
            </LemonButton>
            <LemonButton size="small" type="tertiary" onClick={() => onAddBlock('checklist')}>
              ☑ Checklist Task
            </LemonButton>
          </div>
        )}

      </div>
    </div>
  )
}
