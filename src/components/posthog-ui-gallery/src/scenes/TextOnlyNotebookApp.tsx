import React, { useState } from 'react'
import {
  LemonButton,
  LemonTag,
  ProfilePicture,
  LemonCheckbox,
  LemonTextArea,
} from '../components/lemon-ui'
import {
  IconPlus,
  IconTrash,
  IconNotebook,
} from '../components/icons'

const IconArrowLeft = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
)

const IconOpenSidebar = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
)

const IconEllipsis = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
)

export type BlockType = 'h1' | 'h2' | 'paragraph' | 'code' | 'query' | 'checklist' | 'comment' | 'recording'

export interface NotebookBlock {
  id: string
  type: BlockType
  content: string
  checked?: boolean
  queryOutput?: { label: string; value: number; percentage: string }[]
  commentReplies?: { id: string; author: string; text: string; time: string }[]
  recordingData?: { user: string; duration: string; timestamp: string }
}

export interface TextOnlyNotebookAppProps {
  onBack?: () => void
  shortId?: string
  initialTitle?: string
}

export function TextOnlyNotebookApp({
  onBack,
  shortId = '12345',
  initialTitle = 'testing my notebook',
}: TextOnlyNotebookAppProps): JSX.Element {
  const [title, setTitle] = useState(initialTitle)
  const [activeSlashBlockId, setActiveSlashBlockId] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')

  // Monorepo Canonical Notebook Block State starting from existing empty notebook design
  const [blocks, setBlocks] = useState<NotebookBlock[]>([
    {
      id: 'b-1',
      type: 'paragraph',
      content: 'here is where my amazing content is',
    },
    {
      id: 'b-2',
      type: 'paragraph',
      content: 'With even more text',
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
      type: 'code',
      content: `-- HogQL Event Breakdown Query\nSELECT \n  properties.$current_url as url,\n  count() as pageviews\nFROM events\nWHERE event = '$pageview'\nGROUP BY url\nORDER BY pageviews DESC\nLIMIT 5`,
    },
    {
      id: 'b-5',
      type: 'comment',
      content: 'Anchored on Step 3 Payment Verification Dropoff',
      commentReplies: [
        { id: 'cr-1', author: 'James Green', text: 'SeaweedFS payload limit might be hit during activity spikes.', time: '2 hours ago' },
        { id: 'cr-2', author: 'Alex Smith', text: 'Investigating Temporal worker execution logs right now.', time: '1 hour ago' },
      ],
    },
    {
      id: 'b-6',
      type: 'checklist',
      content: 'Deploy hotfix PR #4822 to store large Temporal activity payloads by reference to SeaweedFS',
      checked: true,
    },
    {
      id: 'b-7',
      type: 'checklist',
      content: 'Verify ClickHouse precompute query cache performance on prod-us and prod-eu clusters',
      checked: false,
    },
  ])

  // Block handlers
  const handleUpdateContent = (id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)))
  }

  const handleToggleChecklist = (id: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, checked: !b.checked } : b)))
  }

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
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
          ? 'New action item'
          : newType === 'query'
          ? 'SELECT event, count() FROM events GROUP BY event'
          : 'New paragraph text...',
      checked: false,
      queryOutput:
        newType === 'query'
          ? [
              { label: 'Step 1', value: 1000, percentage: '100%' },
              { label: 'Step 2', value: 650, percentage: '65%' },
            ]
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

  const handleAddReply = (blockId: string, text: string) => {
    if (!text.trim()) return
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === blockId) {
          const updated = [
            ...(b.commentReplies || []),
            { id: `cr-${Date.now()}`, author: "You (Paul D'Amora)", text: text.trim(), time: 'Just now' },
          ]
          return { ...b, commentReplies: updated }
        }
        return b
      })
    )
  }

  return (
    <div
      className="scene-content flex flex-col gap-y-4 relative z-10 min-h-screen"
      style={{
        backgroundColor: 'var(--bg-3000)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-3000)',
        padding: '1rem',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>

        {/* ── Top Bar / Navigation (100% Mobile Responsive) ───────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border-3000)',
          }}
        >
          {/* Left: Back button & Metadata */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {onBack && (
              <LemonButton
                size="small"
                type="tertiary"
                icon={<IconArrowLeft />}
                onClick={onBack}
              >
                Back to Notebooks
              </LemonButton>
            )}

            <span style={{ color: 'var(--border-3000)', display: 'inline-block' }}>|</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              <span>Modified</span>
              <ProfilePicture name="Paul" email="paul@posthog.com" size="xs" showName />
              <span>2 hours ago</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LemonButton
              size="small"
              type="secondary"
              sideIcon={<IconOpenSidebar />}
              onClick={() => alert('Opening context panel...')}
            >
              Open in context panel
            </LemonButton>
            <LemonButton
              size="small"
              type="tertiary"
              icon={<IconEllipsis />}
              aria-label="Notebook menu"
            />
          </div>
        </div>

        {/* ── Notebook Canvas Editor (Mobile Responsive ProseMirror) ── */}
        <div className="Notebook" style={{ marginTop: 0 }}>
          <div
            className="NotebookEditor"
            style={{
              width: '100%',
              maxWidth: '800px',
              margin: '0 auto',
              backgroundColor: 'var(--color-bg-surface-primary)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border-3000)',
              padding: '1.5rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              minHeight: '500px',
            }}
          >
            <div className="ProseMirror" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Editable Notebook Title */}
              <h1
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setTitle(e.currentTarget.textContent || 'Untitled')}
                style={{
                  outline: 'none',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: 'var(--text-3000)',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-title)',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                }}
              >
                {title}
              </h1>

              {/* Render Notebook Block Nodes */}
              {blocks.map((block) => (
                <div
                  key={block.id}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    width: '100%',
                  }}
                >
                  {/* Block Header Toolbar on Mobile/Desktop */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{block.type}</span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <LemonButton
                        size="xsmall"
                        type="tertiary"
                        onClick={() => setActiveSlashBlockId(activeSlashBlockId === block.id ? null : block.id)}
                      >
                        + Add block
                      </LemonButton>
                      <LemonButton
                        size="xsmall"
                        type="tertiary"
                        onClick={() => handleDeleteBlock(block.id)}
                      >
                        🗑
                      </LemonButton>
                    </div>
                  </div>

                  {/* Block Content Renderers */}
                  {block.type === 'paragraph' && (
                    <p
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleUpdateContent(block.id, e.currentTarget.textContent || '')}
                      style={{
                        outline: 'none',
                        fontSize: '0.9375rem',
                        lineHeight: 1.7,
                        color: 'var(--text-3000)',
                        margin: 0,
                        wordBreak: 'break-word',
                      }}
                    >
                      {block.content}
                    </p>
                  )}

                  {block.type === 'h1' && (
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-title)' }}>
                      {block.content}
                    </h1>
                  )}

                  {block.type === 'h2' && (
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, fontFamily: 'var(--font-title)' }}>
                      {block.content}
                    </h2>
                  )}

                  {/* Code Block */}
                  {block.type === 'code' && (
                    <div
                      style={{
                        borderRadius: 'var(--radius)',
                        padding: '0.875rem',
                        backgroundColor: '#18181b',
                        color: '#f4f4f5',
                        overflowX: 'auto',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
                        <span>HogQL SQL Node</span>
                        <span>SQL</span>
                      </div>
                      <textarea
                        value={block.content}
                        onChange={(e) => handleUpdateContent(block.id, e.target.value)}
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

                  {/* Query Viz Block */}
                  {block.type === 'query' && (
                    <div
                      style={{
                        borderRadius: 'var(--radius)',
                        padding: '1rem',
                        border: '1px solid var(--border-3000)',
                        backgroundColor: 'var(--color-bg-surface-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>📊 Funnel Breakdown Node</div>
                        <LemonTag type="highlight">Trends</LemonTag>
                      </div>
                      <LemonTextArea value={block.content} onChange={(val) => handleUpdateContent(block.id, val)} rows={2} />
                      {block.queryOutput && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
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

                  {/* Checklist Item */}
                  {block.type === 'checklist' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <LemonCheckbox checked={!!block.checked} onChange={() => handleToggleChecklist(block.id)} />
                      <input
                        type="text"
                        value={block.content}
                        onChange={(e) => handleUpdateContent(block.id, e.target.value)}
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
                      style={{
                        borderRadius: 'var(--radius)',
                        padding: '0.875rem',
                        border: '1px solid var(--border-3000)',
                        backgroundColor: 'var(--color-bg-surface-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-accent, #1d4ed8)' }}>
                        💬 Discussion Thread
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{block.content}</div>
                      {block.commentReplies?.map((cr) => (
                        <div key={cr.id} style={{ paddingLeft: '0.75rem', borderLeft: '2px solid var(--border-3000)', fontSize: '0.8125rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.75rem' }}>{cr.author} • {cr.time}</div>
                          <div>{cr.text}</div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
                        <input
                          type="text"
                          placeholder="Write a reply..."
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          style={{
                            flex: 1,
                            fontSize: '0.75rem',
                            padding: '0.375rem 0.625rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-3000)',
                            outline: 'none',
                          }}
                        />
                        <LemonButton
                          size="xsmall"
                          type="primary"
                          onClick={() => {
                            handleAddReply(block.id, replyInput)
                            setReplyInput('')
                          }}
                        >
                          Reply
                        </LemonButton>
                      </div>
                    </div>
                  )}

                  {/* Slash Popover Menu */}
                  {activeSlashBlockId === block.id && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 500,
                        width: '220px',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius)',
                        backgroundColor: 'var(--color-bg-surface-primary)',
                        border: '1px solid var(--border-3000)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', padding: '0.25rem 0.5rem' }}>
                        Insert Block Node
                      </div>
                      <LemonButton size="small" type="tertiary" onClick={() => handleAddBlock(block.id, 'paragraph')}>
                        📝 Paragraph
                      </LemonButton>
                      <LemonButton size="small" type="tertiary" onClick={() => handleAddBlock(block.id, 'h1')}>
                        # Heading 1
                      </LemonButton>
                      <LemonButton size="small" type="tertiary" onClick={() => handleAddBlock(block.id, 'h2')}>
                        ## Heading 2
                      </LemonButton>
                      <LemonButton size="small" type="tertiary" onClick={() => handleAddBlock(block.id, 'query')}>
                        📊 Trends Query
                      </LemonButton>
                      <LemonButton size="small" type="tertiary" onClick={() => handleAddBlock(block.id, 'code')}>
                        💻 HogQL SQL Code
                      </LemonButton>
                      <LemonButton size="small" type="tertiary" onClick={() => handleAddBlock(block.id, 'checklist')}>
                        ☑ Checklist Item
                      </LemonButton>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Content Hint / Slash Prompt */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px dashed var(--border-3000)',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '0.8125rem',
                  userSelect: 'none',
                  flexWrap: 'wrap',
                }}
              >
                <LemonButton
                  size="xsmall"
                  type="tertiary"
                  icon={<IconPlus />}
                  onClick={() => handleAddBlock(blocks[blocks.length - 1]?.id || 'b-1', 'paragraph')}
                >
                  Add node
                </LemonButton>
                <span>Type <kbd style={{ padding: '0.1rem 0.3rem', borderRadius: '4px', background: 'var(--bg-3000)', border: '1px solid var(--border-3000)', fontFamily: 'var(--font-mono)' }}>/</kbd> for commands</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
