import React, { useState } from 'react'
import clsx from 'clsx'
import {
  LemonButton,
  LemonTag,
  LemonBanner,
  LemonInput,
  MemberSelectDropdown,
  ProfilePicture,
} from '../components/lemon-ui'
import { ScrollableShadows } from '../components/ScrollableShadows'

// ── Inline SVG icons (zero package dependency) ─────────────────────────────

const IconSearch = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IconPlus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IconEllipsis = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
)
const IconSortAsc = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
)
const IconSortDesc = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const IconChevronLeft = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const IconChevronRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// ── Data ──────────────────────────────────────────────────────────────────────

export interface NotebookItem {
  id: string
  short_id: string
  title: string
  is_template?: boolean
  created_by: { first_name: string; email: string }
  created_at: string
  last_modified_at: string
}

const SAMPLE_NOTEBOOKS: NotebookItem[] = [
  {
    id: '1', short_id: 'nb-onboarding',
    title: 'User Onboarding Funnel & Conversion Analysis',
    is_template: true,
    created_by: { first_name: 'Jane Doe', email: 'jane@posthog.com' },
    created_at: '2 days ago', last_modified_at: '1 hour ago',
  },
  {
    id: '2', short_id: 'nb-q3-churn',
    title: 'Q3 Feature Adoption & Churn Investigation',
    is_template: false,
    created_by: { first_name: 'Alex Smith', email: 'alex@posthog.com' },
    created_at: '5 days ago', last_modified_at: '3 hours ago',
  },
  {
    id: '3', short_id: 'nb-checkout-replay',
    title: 'Checkout Drop-off Session Replay Notes',
    is_template: false,
    created_by: { first_name: 'Jane Doe', email: 'jane@posthog.com' },
    created_at: '1 week ago', last_modified_at: 'Yesterday',
  },
  {
    id: '4', short_id: 'nb-api-latency',
    title: 'API Latency & Error Rate Debugging Log',
    is_template: false,
    created_by: { first_name: 'Engineering Team', email: 'eng@posthog.com' },
    created_at: '2 weeks ago', last_modified_at: '4 days ago',
  },
  {
    id: '5', short_id: 'nb-signup-exp',
    title: 'Signup Flow Variant A/B Experiment Results',
    is_template: true,
    created_by: { first_name: 'Growth Team', email: 'growth@posthog.com' },
    created_at: '1 month ago', last_modified_at: '2 weeks ago',
  },
]

type SortField = 'title' | 'created_by' | 'created_at' | 'last_modified_at'
type SortOrder = 'asc' | 'desc'

// ── Scene ─────────────────────────────────────────────────────────────────────

export interface NotebooksListAppProps {
  onSelectNotebook?: (id: string, title: string) => void
}

export function NotebooksListApp({ onSelectNotebook }: NotebooksListAppProps = {}): JSX.Element {
  const [search, setSearch] = useState('')
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all')
  const [notebooks, setNotebooks] = useState<NotebookItem[]>(SAMPLE_NOTEBOOKS)
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const filtered = notebooks
    .filter(
      (nb) =>
        nb.title.toLowerCase().includes(search.toLowerCase()) &&
        (selectedAuthor === 'all' || nb.created_by.first_name.includes(selectedAuthor))
    )
    .sort((a, b) => {
      const valA = sortField === 'created_by' ? a.created_by.first_name : a[sortField] || ''
      const valB = sortField === 'created_by' ? b.created_by.first_name : b[sortField] || ''
      const comp = valA.localeCompare(valB)
      return sortOrder === 'asc' ? comp : -comp
    })

  const handleDelete = (id: string): void =>
    setNotebooks((prev) => prev.filter((nb) => nb.id !== id))

  return (
    <div className="scene-content flex flex-col gap-y-4 relative z-10" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-3000)', fontFamily: 'var(--font-sans)', color: 'var(--text-3000)', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}>

        {/* ── SceneTitleSection ───────────────────────────────────── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, fontFamily: 'var(--font-title)' }}>
              Notebooks
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LemonButton size="small" type="tertiary" icon={<IconEllipsis />} />
            <LemonButton size="small" type="secondary" data-attr="new-canvas">
              New canvas
            </LemonButton>
            <LemonButton size="small" type="primary" icon={<IconPlus />} data-attr="new-notebook">
              New notebook
            </LemonButton>
          </div>
        </div>

        {/* ── NotebooksTable Content ───────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* ── Search & Filter Controls ──────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ width: '16rem' }}>
              <LemonInput
                type="search"
                placeholder="Search for notebooks"
                value={search}
                onChange={setSearch}
                data-attr="notebooks-search"
                prefix={<IconSearch style={{ fontSize: '0.875rem', color: 'var(--muted)' }} />}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Containing:</span>
                <LemonTag type="option">Any content</LemonTag>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Created by:</span>
                <MemberSelectDropdown
                  value={selectedAuthor}
                  onChange={setSelectedAuthor}
                  defaultLabel="All Members"
                  options={[
                    { value: 'all', label: 'All Members' },
                    { value: 'Jane', label: 'Jane Doe' },
                    { value: 'Alex', label: 'Alex Smith' },
                    { value: 'Growth', label: 'Growth Team' },
                    { value: 'Engineering', label: 'Engineering Team' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* ── LemonTable ────────────────────────────────────────── */}
          <div className={clsx('LemonTable')} data-attr="notebooks-table">
            <ScrollableShadows direction="horizontal">
              <div className="LemonTable__content">
                <table style={{ width: '100%', minWidth: '750px' }}>
                  <thead>
                    <tr className="LemonTable__loader-row">
                      <th className="LemonTable__loader-host" colSpan={5} />
                    </tr>
                    <tr>
                      {/* Title Header */}
                      <th
                        className="LemonTable__header LemonTable__header--actionable"
                        style={{ width: '45%' }}
                        onClick={() => handleSort('title')}
                      >
                        <div className="LemonTable__header-content">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>Title</span>
                            {sortField === 'title' && (
                              <span className="sorting-indicator">
                                {sortOrder === 'asc' ? <IconSortAsc /> : <IconSortDesc />}
                              </span>
                            )}
                          </div>
                        </div>
                      </th>

                      {/* Created By Header */}
                      <th
                        className="LemonTable__header LemonTable__header--actionable"
                        onClick={() => handleSort('created_by')}
                      >
                        <div className="LemonTable__header-content">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>Created by</span>
                            {sortField === 'created_by' && (
                              <span className="sorting-indicator">
                                {sortOrder === 'asc' ? <IconSortAsc /> : <IconSortDesc />}
                              </span>
                            )}
                          </div>
                        </div>
                      </th>

                      {/* Created At Header (Right Aligned) */}
                      <th
                        className="LemonTable__header LemonTable__header--actionable"
                        style={{ textAlign: 'right' }}
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="LemonTable__header-content" style={{ justifyContent: 'flex-end' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>Created</span>
                            {sortField === 'created_at' && (
                              <span className="sorting-indicator">
                                {sortOrder === 'asc' ? <IconSortAsc /> : <IconSortDesc />}
                              </span>
                            )}
                          </div>
                        </div>
                      </th>

                      {/* Last Modified Header (Right Aligned) */}
                      <th
                        className="LemonTable__header LemonTable__header--actionable"
                        style={{ textAlign: 'right' }}
                        onClick={() => handleSort('last_modified_at')}
                      >
                        <div className="LemonTable__header-content" style={{ justifyContent: 'flex-end' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>Last modified</span>
                            {sortField === 'last_modified_at' && (
                              <span className="sorting-indicator">
                                {sortOrder === 'asc' ? <IconSortAsc /> : <IconSortDesc />}
                              </span>
                            )}
                          </div>
                        </div>
                      </th>

                      {/* Actions Header */}
                      <th className="LemonTable__header" style={{ width: '4rem' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="LemonTable__empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                            No notebooks matching your filters!
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((notebook, idx) => (
                        <tr key={notebook.id}>
                          {/* Title Column (Link + optional TEMPLATE LemonTag) */}
                          <td>
                            <div className="font-semibold flex items-center gap-2">
                              <a
                                data-attr="notebook-title"
                                style={{ color: 'var(--text-3000)', textDecoration: 'none', cursor: 'pointer' }}
                                onClick={() => onSelectNotebook?.(notebook.id, notebook.title)}
                                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                {notebook.title}
                              </a>
                              {notebook.is_template && (
                                <LemonTag type="highlight">TEMPLATE</LemonTag>
                              )}
                            </div>
                          </td>

                          {/* Created By Column (ProfilePicture) */}
                          <td>
                            <div className="flex flex-row items-center flex-nowrap">
                              <ProfilePicture
                                name={notebook.created_by.first_name}
                                email={notebook.created_by.email}
                                showName
                                size="md"
                              />
                            </div>
                          </td>

                          {/* Created Column (Right Aligned) */}
                          <td style={{ textAlign: 'right' }}>
                            <div className="whitespace-nowrap text-right" style={{ color: 'var(--color-text-secondary)' }}>
                              {notebook.created_at}
                            </div>
                          </td>

                          {/* Last Modified Column (Right Aligned) */}
                          <td style={{ textAlign: 'right' }}>
                            <div className="whitespace-nowrap text-right" style={{ color: 'var(--color-text-secondary)' }}>
                              {notebook.last_modified_at}
                            </div>
                          </td>

                          {/* Actions Column (LemonMenu button with IconEllipsis, hidden for templates) */}
                          <td style={{ textAlign: 'right' }}>
                            {!notebook.is_template && (
                              <LemonButton
                                aria-label="more"
                                icon={<IconEllipsis />}
                                size="small"
                                type="tertiary"
                                onClick={() => handleDelete(notebook.id)}
                              />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollableShadows>

            {/* ── Pagination Footer ─────────────────────────────────── */}
            <div
              className="PaginationControl"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderTop: '1px solid var(--color-border-primary)',
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              <div>
                1 – {filtered.length} of {filtered.length} notebooks
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <LemonButton size="small" type="tertiary" disabled icon={<IconChevronLeft />} />
                <LemonButton size="small" type="tertiary" disabled icon={<IconChevronRight />} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
