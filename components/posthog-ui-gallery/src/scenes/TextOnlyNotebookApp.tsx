import React, { useState } from 'react'
import {
  LemonButton,
  LemonTag,
  ProfilePicture,
} from '../components/lemon-ui'

// ── Inline SVG icons ────────────────────────────────────────────────────────

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

const IconPlus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

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
  const [p1, setP1] = useState('here is where my amazing content is')
  const [p2, setP2] = useState('With even more text')

  return (
    <div
      className="scene-content flex flex-col gap-y-4 relative z-10 min-h-screen"
      style={{
        backgroundColor: 'var(--bg-3000)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-3000)',
        padding: '1.5rem',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

        {/* ── Top Bar / Navigation ──────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.5rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border-3000)',
          }}
        >
          {/* Left: Back button & Metadata */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LemonButton
              size="small"
              type="tertiary"
              icon={<IconArrowLeft />}
              onClick={onBack}
            >
              Back to Notebooks
            </LemonButton>

            <span style={{ color: 'var(--border-3000)' }}>|</span>

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

        {/* ── Notebook Canvas Editor ───────────────────────────────── */}
        <div className="Notebook" style={{ marginTop: 0 }}>
          <div
            className="NotebookEditor"
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              backgroundColor: 'var(--color-bg-surface-primary)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border-3000)',
              padding: '2.5rem 3rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              minHeight: '500px',
            }}
          >
            <div className="ProseMirror">
              {/* Editable Notebook Title */}
              <h1
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setTitle(e.currentTarget.textContent || 'Untitled')}
                style={{
                  outline: 'none',
                  fontSize: '1.75rem',
                  fontWeight: 600,
                  color: 'var(--text-3000)',
                  marginBottom: '1rem',
                  fontFamily: 'var(--font-title)',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h1>

              {/* Paragraph 1 */}
              <p
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setP1(e.currentTarget.textContent || '')}
                style={{
                  outline: 'none',
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  color: 'var(--text-3000)',
                  marginBottom: '0.8rem',
                }}
              >
                {p1}
              </p>

              {/* Paragraph 2 */}
              <p
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setP2(e.currentTarget.textContent || '')}
                style={{
                  outline: 'none',
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  color: 'var(--text-3000)',
                  marginBottom: '0.8rem',
                }}
              >
                {p2}
              </p>

              {/* Add Content Hint / Slash Prompt */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '2rem',
                  paddingTop: '1rem',
                  borderTop: '1px dashed var(--border-3000)',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '0.8125rem',
                  userSelect: 'none',
                }}
              >
                <LemonButton size="xsmall" type="tertiary" icon={<IconPlus />}>
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
