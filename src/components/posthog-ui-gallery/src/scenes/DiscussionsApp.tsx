import React, { useState } from 'react'
import {
  LemonButton,
  LemonInput,
  ProfilePicture,
  LemonTextArea,
} from '../components/lemon-ui'

export interface CommentUser {
  first_name: string
  email: string
}

export interface CommentItem {
  id: string
  created_by: CommentUser
  created_at: string
  content: string
  reactions: Record<string, { user: string }[]>
}

export interface CommentWithRepliesData {
  id: string
  comment: CommentItem
  replies: CommentWithRepliesData[]
}

export interface DiscussionsAppProps {
  onBack?: () => void
}

export function DiscussionsApp({ onBack }: { onBack?: () => void } = {}): JSX.Element {
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>('c-1')
  const [inlineReplyText, setInlineReplyText] = useState('')
  const [newThreadText, setNewThreadText] = useState('')

  // Clean PostHog Discussion Data
  const [threads, setThreads] = useState<CommentWithRepliesData[]>([
    {
      id: 'thread-1',
      comment: {
        id: 'c-1',
        created_by: { first_name: 'James Green', email: 'james@posthog.com' },
        created_at: '2 hours ago',
        content:
          'Hey @Alex, notice the 40% dropoff on Step 3 for EU users in this retention insight? Is the SeaweedFS payload size limit impacting query performance or event capture here?',
        reactions: {
          '👍': [{ user: 'Alex' }, { user: 'Elena' }, { user: 'Marcus' }],
          '🚀': [{ user: 'Sarah' }],
        },
      },
      replies: [
        {
          id: 'thread-1-r1',
          comment: {
            id: 'c-1-1',
            created_by: { first_name: 'Alex Smith', email: 'alex@posthog.com' },
            created_at: '1 hour ago',
            content: 'Checking Temporal worker logs now. Looks like payload cap hit ~2.1MB on team_id 2 during precompute.',
            reactions: { '👀': [{ user: 'Elena' }, { user: 'James' }] },
          },
          replies: [],
        },
        {
          id: 'thread-1-r2',
          comment: {
            id: 'c-1-2',
            created_by: { first_name: 'Elena Rostova', email: 'elena@posthog.com' },
            created_at: '45 mins ago',
            content: 'Fixed the activity payload serialization in PR #4821 by storing results to SeaweedFS by reference.',
            reactions: { '🎉': [{ user: 'Alex' }, { user: 'James' }, { user: 'Sarah' }] },
          },
          replies: [],
        },
      ],
    },
    {
      id: 'thread-2',
      comment: {
        id: 'c-2',
        created_by: { first_name: 'Sarah Jenkins', email: 'sarah@posthog.com' },
        created_at: '5 hours ago',
        content:
          'Can we add a breakdown by device type here? Session recordings show mobile users exiting early on the payment verification screen.',
        reactions: { '❤️': [{ user: 'Paul' }, { user: 'Marcus' }] },
      },
      replies: [
        {
          id: 'thread-2-r1',
          comment: {
            id: 'c-2-1',
            created_by: { first_name: 'Marcus Vance', email: 'marcus@posthog.com' },
            created_at: '3 hours ago',
            content: 'Done! Added breakdown bar chart below in the notebook editor.',
            reactions: { '🙌': [{ user: 'Sarah' }] },
          },
          replies: [],
        },
      ],
    },
    {
      id: 'thread-3',
      comment: {
        id: 'c-3',
        created_by: { first_name: 'Paul D\'Amora', email: 'paul@posthog.com' },
        created_at: '1 day ago',
        content:
          'Updated DAU/MAU ratios for July. Everything looks healthy post-deployment across US and EU pods.',
        reactions: { '🎉': [{ user: 'James' }], '👍': [{ user: 'Elena' }] },
      },
      replies: [],
    },
  ])

  const handleSendReaction = (commentId: string, emoji: string) => {
    setThreads((prev) => {
      const toggleEmoji = (list: CommentWithRepliesData[]): CommentWithRepliesData[] =>
        list.map((item) => {
          if (item.comment.id === commentId) {
            const currentList = item.comment.reactions[emoji] || []
            const exists = currentList.some((r) => r.user === 'Paul')
            const newList = exists
              ? currentList.filter((r) => r.user !== 'Paul')
              : [...currentList, { user: 'Paul' }]

            const newReactions = { ...item.comment.reactions }
            if (newList.length === 0) {
              delete newReactions[emoji]
            } else {
              newReactions[emoji] = newList
            }

            return {
              ...item,
              comment: { ...item.comment, reactions: newReactions },
            }
          }
          return { ...item, replies: toggleEmoji(item.replies) }
        })
      return toggleEmoji(prev)
    })
  }

  const handleAddInlineReply = (parentCommentId: string) => {
    if (!inlineReplyText.trim()) return

    const newReplyNode: CommentWithRepliesData = {
      id: `r-${Date.now()}`,
      comment: {
        id: `c-${Date.now()}`,
        created_by: { first_name: 'Paul D\'Amora', email: 'paul@posthog.com' },
        created_at: 'Just now',
        content: inlineReplyText,
        reactions: {},
      },
      replies: [],
    }

    setThreads((prev) => {
      const attachReply = (list: CommentWithRepliesData[]): CommentWithRepliesData[] =>
        list.map((item) => {
          if (item.comment.id === parentCommentId) {
            return { ...item, replies: [...item.replies, newReplyNode] }
          }
          return { ...item, replies: attachReply(item.replies) }
        })
      return attachReply(prev)
    })

    setInlineReplyText('')
    setActiveReplyCommentId(null)
  }

  const handleCreateNewThread = () => {
    if (!newThreadText.trim()) return

    const newThread: CommentWithRepliesData = {
      id: `t-${Date.now()}`,
      comment: {
        id: `c-${Date.now()}`,
        created_by: { first_name: 'Paul D\'Amora', email: 'paul@posthog.com' },
        created_at: 'Just now',
        content: newThreadText,
        reactions: {},
      },
      replies: [],
    }

    setThreads([newThread, ...threads])
    setNewThreadText('')
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
        position: 'relative',
        overflow: 'hidden',
        padding: '1.5rem 1rem',
      }}
    >
      {/* ── Ambient Glowing Glassmorphism Background Blobs ────────────── */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '15%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 78, 0, 0.18) 0%, rgba(245, 78, 0, 0) 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0) 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '-5%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 70%)',
          filter: 'blur(65px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Main Clean Discussion Canvas (NO TOP TOOLBAR / EXPLANATIONS) ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'stretch',
          width: '100%',
          maxWidth: '840px',
          margin: '0 auto',
          zIndex: 1,
        }}
      >
        <div
          className="posthog-glass-panel"
          style={{
            width: '100%',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Comment Threads Feed */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {threads.map((thread) => (
              <GlassCommentCard
                key={thread.id}
                item={thread}
                activeReplyCommentId={activeReplyCommentId}
                inlineReplyText={inlineReplyText}
                onSetInlineReplyText={setInlineReplyText}
                onToggleReplyPanel={(commentId) => {
                  if (activeReplyCommentId === commentId) {
                    setActiveReplyCommentId(null)
                  } else {
                    setActiveReplyCommentId(commentId)
                    setInlineReplyText('')
                  }
                }}
                onAddInlineReply={handleAddInlineReply}
                onSendReaction={handleSendReaction}
              />
            ))}
          </div>

          {/* New Thread Glass Composer at Bottom */}
          <div
            className="posthog-glass"
            style={{
              padding: '1rem 1.25rem',
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ProfilePicture name="Paul D'Amora" email="paul@posthog.com" size="xs" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Start a new discussion thread...
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <LemonInput
                  placeholder="New comment topic..."
                  value={newThreadText}
                  onChange={setNewThreadText}
                  onPressEnter={handleCreateNewThread}
                />
              </div>
              <LemonButton size="small" type="primary" disabled={!newThreadText.trim()} onClick={handleCreateNewThread}>
                Post
              </LemonButton>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

{/* ── Subcomponent: Glassmorphism Comment Card ── */}
function GlassCommentCard({
  item,
  activeReplyCommentId,
  inlineReplyText,
  onSetInlineReplyText,
  onToggleReplyPanel,
  onAddInlineReply,
  onSendReaction,
}: {
  item: CommentWithRepliesData
  activeReplyCommentId: string | null
  inlineReplyText: string
  onSetInlineReplyText: (val: string) => void
  onToggleReplyPanel: (id: string) => void
  onAddInlineReply: (id: string) => void
  onSendReaction: (id: string, emoji: string) => void
}): JSX.Element {
  const { comment, replies } = item
  const isReplyingThisCard = activeReplyCommentId === comment.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Frosted Glass Comment Card */}
      <div
        className="Comment posthog-glass"
        style={{
          border: isReplyingThisCard ? '2px solid var(--color-accent, #1d4ed8)' : '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.875rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
          boxShadow: isReplyingThisCard ? '0 0 0 3px rgba(29,78,216,0.12)' : '0 4px 16px rgba(0,0,0,0.03)',
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Author Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <ProfilePicture name={comment.created_by.first_name} email={comment.created_by.email} size="sm" />
            <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{comment.created_by.first_name}</div>
          </div>

          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>{comment.created_at}</span>
        </div>

        {/* Comment Text */}
        <div
          style={{
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            color: 'var(--text-3000)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {comment.content}
        </div>

        {/* Reaction Bar & Clean Reply Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
            {Object.entries(comment.reactions).map(([emoji, list]) => (
              <LemonButton
                key={emoji}
                size="xsmall"
                type="tertiary"
                onClick={() => onSendReaction(comment.id, emoji)}
                style={{ border: '1px solid rgba(0,0,0,0.08)', backgroundColor: 'rgba(255,255,255,0.6)', padding: '0 0.375rem' }}
              >
                <span>{emoji}</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, marginLeft: '0.25rem' }}>{list.length}</span>
              </LemonButton>
            ))}

            <LemonButton size="xsmall" type="tertiary" onClick={() => onSendReaction(comment.id, '👍')}>
              👍
            </LemonButton>
            <LemonButton size="xsmall" type="tertiary" onClick={() => onSendReaction(comment.id, '🚀')}>
              🚀
            </LemonButton>
          </div>

          {/* Clean Reply Button */}
          <LemonButton
            size="xsmall"
            type={isReplyingThisCard ? 'primary' : 'tertiary'}
            onClick={() => onToggleReplyPanel(comment.id)}
          >
            {isReplyingThisCard ? 'Cancel' : 'Reply'}
          </LemonButton>
        </div>

        {/* ── Downward Expanding Glass Inline Textarea ──────── */}
        {isReplyingThisCard && (
          <div
            style={{
              marginTop: '0.5rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
              animation: 'fadeIn 150ms ease-in-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ProfilePicture name="Paul D'Amora" email="paul@posthog.com" size="xs" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Replying to {comment.created_by.first_name}...
              </span>
            </div>

            <LemonTextArea
              placeholder={`Write a reply to ${comment.created_by.first_name}...`}
              value={inlineReplyText}
              onChange={onSetInlineReplyText}
              rows={3}
              autoFocus
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <LemonButton size="xsmall" type="tertiary" onClick={() => onSetInlineReplyText(inlineReplyText + ' 👍')}>👍</LemonButton>
                <LemonButton size="xsmall" type="tertiary" onClick={() => onSetInlineReplyText(inlineReplyText + ' 🚀')}>🚀</LemonButton>
                <LemonButton size="xsmall" type="tertiary" onClick={() => onSetInlineReplyText(inlineReplyText + ' 🎉')}>🎉</LemonButton>
              </div>

              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <LemonButton
                  size="small"
                  type="secondary"
                  onClick={() => onToggleReplyPanel(comment.id)}
                >
                  Cancel
                </LemonButton>
                <LemonButton
                  size="small"
                  type="primary"
                  disabled={!inlineReplyText.trim()}
                  onClick={() => onAddInlineReply(comment.id)}
                >
                  Add reply
                </LemonButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Child Replies */}
      {replies.length > 0 && (
        <div style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '2px solid rgba(0, 0, 0, 0.08)', marginLeft: '0.75rem' }}>
          {replies.map((reply) => (
            <GlassCommentCard
              key={reply.id}
              item={reply}
              activeReplyCommentId={activeReplyCommentId}
              inlineReplyText={inlineReplyText}
              onSetInlineReplyText={onSetInlineReplyText}
              onToggleReplyPanel={onToggleReplyPanel}
              onAddInlineReply={onAddInlineReply}
              onSendReaction={onSendReaction}
            />
          ))}
        </div>
      )}
    </div>
  )
}
