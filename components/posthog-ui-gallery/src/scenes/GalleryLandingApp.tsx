import React from 'react'
import { LemonButton, LemonTag } from '../components/lemon-ui'
import type { SceneType } from '../App'

export interface GalleryLandingAppProps {
  onSelectScene: (sceneId: SceneType) => void
}

export function GalleryLandingApp({ onSelectScene }: GalleryLandingAppProps): JSX.Element {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-3000)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-3000)',
        padding: '2.5rem 1.5rem',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* ── Gallery Header ───────────────────────────────────────── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-title)', letterSpacing: '-0.02em' }}>
              PostHog UI Gallery
            </h1>
            <LemonTag type="highlight">3000 Design System</LemonTag>
          </div>
          <p style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Standalone React 1:1 component replicas extracted directly from PostHog&apos;s Storybook and production codebase.
          </p>
        </div>

        {/* ── Component Index List ────────────────────────────────── */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', fontFamily: 'var(--font-title)', color: 'var(--text-3000)' }}>
            Component Scenes Index
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Item 1: Notebooks List */}
            <div
              onClick={() => onSelectScene('list')}
              style={{
                backgroundColor: 'var(--color-bg-surface-primary)',
                border: '1px solid var(--border-3000)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem 1.5rem',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '1rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-bold-3000)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-3000)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-3000)' }}>
                    1. Notebooks List
                  </span>
                  <LemonTag type="option">Table View</LemonTag>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Storybook: <code>Scenes-App/Notebooks → Notebooks List</code> (LemonTable with sorting, avatars, search input &amp; scroll shadows)
                </div>
              </div>

              <LemonButton size="small" type="primary">
                Open Scene →
              </LemonButton>
            </div>

            {/* Item 2: Text-Only Notebook */}
            <div
              onClick={() => onSelectScene('detail')}
              style={{
                backgroundColor: 'var(--color-bg-surface-primary)',
                border: '1px solid var(--border-3000)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem 1.5rem',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '1rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-bold-3000)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-3000)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-3000)' }}>
                    2. Text-Only Notebook
                  </span>
                  <LemonTag type="option">Detail Editor View</LemonTag>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Storybook: <code>Scenes-App/Notebooks → Text-Only Notebook</code> (Full editor document view with editable title, ProseMirror paragraphs &amp; top action bar)
                </div>
              </div>

              <LemonButton size="small" type="primary">
                Open Scene →
              </LemonButton>
            </div>

            {/* Item 3: SidePanel Notebooks */}
            <div
              onClick={() => onSelectScene('sidepanel')}
              style={{
                backgroundColor: 'var(--color-bg-surface-primary)',
                border: '1px solid var(--border-3000)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem 1.5rem',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '1rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-bold-3000)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-3000)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-3000)' }}>
                    3. SidePanel Notebooks
                  </span>
                  <LemonTag type="option">Context Drawer View</LemonTag>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Storybook: <code>Scenes-App/SidePanels → Side Panel Notebooks</code> (Right-side 3000 context panel drawer with notebook editor &amp; popovers)
                </div>
              </div>

              <LemonButton size="small" type="primary">
                Open Scene →
              </LemonButton>
            </div>

            {/* Item 4: Lemon UI Component Showcase */}
            <div
              onClick={() => onSelectScene('lemonui')}
              style={{
                backgroundColor: 'var(--color-bg-surface-primary)',
                border: '1px solid var(--border-3000)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem 1.5rem',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '1rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-bold-3000)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-3000)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-3000)' }}>
                    4. Lemon UI Component Library
                  </span>
                  <LemonTag type="highlight">Component Showcase</LemonTag>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Storybook: <code>Lemon UI/*</code> (LemonButton, LemonInput, LemonSelect, LemonTag, LemonBadge, LemonBanner, LemonTabs, LemonSwitch)
                </div>
              </div>

              <LemonButton size="small" type="primary">
                Open Showcase →
              </LemonButton>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
