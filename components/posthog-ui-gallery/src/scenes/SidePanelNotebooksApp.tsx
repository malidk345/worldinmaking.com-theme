import React, { useState, useEffect, useRef } from 'react'
import { LemonButton, LemonTag, ProfilePicture } from '../components/lemon-ui'

// ── Exact PostHog SVG Icons from @posthog/icons ─────────────────────────────

const IconNotebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.5 4.25C3.5 3.2835 4.2835 2.5 5.25 2.5H18.75C19.7165 2.5 20.5 3.2835 20.5 4.25V19.75C20.5 20.7165 19.7165 21.5 18.75 21.5H5.25C4.2835 21.5 3.5 20.7165 3.5 19.75V16.5H3.25C2.83579 16.5 2.5 16.1642 2.5 15.75C2.5 15.3358 2.83579 15 3.25 15H3.5V12.75H3.25C2.83579 12.75 2.5 12.4142 2.5 12C2.5 11.5858 2.83579 11.25 3.25 11.25H3.5V9H3.25C2.83579 9 2.5 8.66421 2.5 8.25C2.5 7.83579 2.83579 7.5 3.25 7.5H3.5V4.25ZM5 9H5.25C5.66421 9 6 8.66421 6 8.25C6 7.83579 5.66421 7.5 5.25 7.5H5V4.25C5 4.11193 5.11193 4 5.25 4H18.75C18.8881 4 19 4.11193 19 4.25V19.75C19 19.8881 18.8881 20 18.75 20H5.25C5.11193 20 5 19.8881 5 19.75V16.5H5.25C5.66421 16.5 6 16.1642 6 15.75C6 15.3358 5.66421 15 5.25 15H5V12.75H5.25C5.66421 12.75 6 12.4142 6 12C6 11.5858 5.66421 11.25 5.25 11.25H5V9ZM9 8.25C9 7.83579 9.33579 7.5 9.75 7.5H14.25C14.6642 7.5 15 7.83579 15 8.25C15 8.66421 14.6642 9 14.25 9H9.75C9.33579 9 9 8.66421 9 8.25ZM9 12C9 11.5858 9.33579 11.25 9.75 11.25H12.25C12.6642 11.25 13 11.5858 13 12C13 12.4142 12.6642 12.75 12.25 12.75H9.75C9.33579 12.75 9 12.4142 9 12Z"
    />
  </svg>
)

const IconPlusSmall = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconChevronDown = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const IconEllipsis = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
)

const IconExpand45 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
)

const IconDocumentExpand = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="20" />
  </svg>
)

const IconX = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export interface SidePanelNotebooksAppProps {
  onBack?: () => void
}

export function SidePanelNotebooksApp({ onBack }: SidePanelNotebooksAppProps): JSX.Element {
  const [selectedNotebookTitle, setSelectedNotebookTitle] = useState('My scratchpad')
  const [notebookContent, setNotebookContent] = useState('here is where my amazing content is')
  const [showPopover, setShowPopover] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const notebookList = [
    { id: 'scratchpad', title: 'My scratchpad', user: 'Paul', date: '2 hours ago' },
    { id: '1', title: 'User Onboarding Funnel & Conversion Analysis', user: 'Paul', date: 'Yesterday' },
    { id: '2', title: 'Q3 Feature Adoption & Churn Investigation', user: 'Paul', date: '3 days ago' },
    { id: '3', title: 'Checkout Drop-off Session Replay Notes', user: 'Paul', date: '1 week ago' },
  ]

  const filteredNotebooks = notebookList.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Auto-close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPopover(false)
      }
    }
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPopover])

  return (
    <div
      className="SidePanel3000 SidePanel3000--open"
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--color-bg-primary)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-3000)',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
      }}
    >
      {/* ── SidePanel Content Container (NotebookPanel) ─────────── */}
      <div
        className="NotebookPanel"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minWidth: 0,
          backgroundColor: 'var(--color-bg-primary)',
        }}
      >
        {/* ── SidePanelPaneHeader (Orijinal PostHog DOM) ──────────── */}
        <header
          className="scene-panel-pane-header border-b shrink-0 flex items-center justify-between sticky top-0 h-[40px] bg-primary px-2 z-60 border-primary/30"
          style={{
            height: '40px',
            backgroundColor: 'var(--color-bg-surface-secondary)',
            borderBottom: '1px solid var(--border-3000)',
            padding: '0 0.5rem 0 0.75rem',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            gap: '0.5rem',
            flexShrink: 0,
          }}
        >
          {/* Title */}
          <h3
            className="flex items-center gap-1 font-semibold mb-0 truncate pr-1 pl-2 flex-none text-sm"
            style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-title)', color: 'var(--text-3000)' }}
          >
            Notebooks
          </h3>

          {/* LemonButtonWithDropdown Container */}
          <div
            ref={dropdownRef}
            className="flex gap-1"
            style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', position: 'relative', overflow: 'visible' }}
          >
            {/* 1:1 LemonButtonWithDropdown (Storybook Version) */}
            <LemonButton
              type="tertiary"
              size="small"
              active={showPopover}
              onClick={() => setShowPopover(!showPopover)}
              sideIcon={
                <IconChevronDown
                  style={{
                    fontSize: '0.875rem',
                    transition: 'transform 0.2s ease',
                    transform: showPopover ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              }
              truncate
            >
              {selectedNotebookTitle}
            </LemonButton>

            {/* NotebookSyncInfo Tag */}
            <LemonTag className="uppercase select-none" type="success" style={{ fontSize: '0.6875rem', fontWeight: 600 }}>
              Saved
            </LemonTag>

            {/* ── 1:1 LemonDropdown Popover Overlay (Storybook Lemon UI) ─────── */}
            {showPopover && (
              <div
                className="LemonDropdown__box"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 9999,
                  width: '320px',
                  backgroundColor: 'var(--color-bg-surface-primary)',
                  border: '1px solid var(--border-3000)',
                  borderRadius: 'var(--radius)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.375rem',
                }}
              >
                {/* Filter Input */}
                <input
                  type="text"
                  placeholder="Filter notebooks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.625rem',
                    fontSize: '0.8125rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-3000)',
                    backgroundColor: 'var(--color-bg-surface-primary)',
                    outline: 'none',
                    color: 'var(--text-3000)',
                  }}
                />

                {/* Quick Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  <LemonButton
                    size="small"
                    type="tertiary"
                    icon={<IconPlusSmall />}
                    fullWidth
                    onClick={() => {
                      setSelectedNotebookTitle('Untitled Notebook')
                      setShowPopover(false)
                    }}
                  >
                    New notebook
                  </LemonButton>
                  <LemonButton
                    size="small"
                    type="tertiary"
                    icon={<IconNotebook />}
                    fullWidth
                    onClick={() => {
                      setSelectedNotebookTitle('My scratchpad')
                      setShowPopover(false)
                    }}
                  >
                    My scratchpad
                  </LemonButton>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-3000)', margin: '0.25rem 0' }} />

                {/* Notebook List */}
                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {filteredNotebooks.map((nb) => (
                    <LemonButton
                      key={nb.id}
                      size="small"
                      type="tertiary"
                      sideIcon={<ProfilePicture name={nb.user} email="paul@posthog.com" size="xs" />}
                      fullWidth
                      onClick={() => {
                        setSelectedNotebookTitle(nb.title)
                        setShowPopover(false)
                      }}
                      active={nb.title === selectedNotebookTitle}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0, width: '100%' }}>
                        <span className="truncate" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-3000)' }}>
                          {nb.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {nb.user} · {nb.date}
                        </span>
                      </div>
                    </LemonButton>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Right Header Actions */}
          <div className="flex items-center gap-1" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ProfilePicture name="Paul" email="paul@posthog.com" size="xs" showName />
            <LemonButton size="small" type="tertiary" icon={<IconEllipsis />} aria-label="Notebook menu" />
            <LemonButton size="small" type="tertiary" icon={<IconDocumentExpand />} aria-label="Expand width" title="Expand width" />
            <LemonButton size="small" type="tertiary" icon={<IconExpand45 />} aria-label="Open as main focus" title="Open as main focus" />
            {onBack && (
              <LemonButton size="small" type="tertiary" icon={<IconX />} onClick={onBack} aria-label="Close panel" title="Close panel" />
            )}
          </div>
        </header>

        {/* ── Notebook Content Area ─────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 3rem' }}>
          <div className="Notebook" style={{ marginTop: 0 }}>
            <div className="NotebookEditor" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div className="ProseMirror">
                {/* Title */}
                <h1
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setSelectedNotebookTitle(e.currentTarget.textContent || 'Untitled')}
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 600,
                    outline: 'none',
                    marginBottom: '1rem',
                    fontFamily: 'var(--font-title)',
                    color: 'var(--text-3000)',
                  }}
                >
                  {selectedNotebookTitle}
                </h1>

                {/* Paragraph */}
                <p
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setNotebookContent(e.currentTarget.textContent || '')}
                  style={{
                    outline: 'none',
                    fontSize: '0.9375rem',
                    lineHeight: 1.7,
                    color: 'var(--text-3000)',
                    marginBottom: '1.5rem',
                  }}
                >
                  {notebookContent}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── NotebookPanelDropzone ───────────────────────────────── */}
        <div className="NotebookPanelDropzone" style={{ margin: '1rem 2rem' }}>
          <div className="NotebookPanelDropzone__message">
            Drop here for a different Notebook
          </div>
        </div>

      </div>
    </div>
  )
}
