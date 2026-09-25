import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SourcesPanel, sourcesCountLabel } from './SourcesPanel'
import type { WebCitation } from '../types'

// React 18 act() environment flag for non-RTL rendering.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class RO {
  observe() { return undefined }
  disconnect() { return undefined }
  unobserve() { return undefined }
}

const paper: WebCitation = {
  id: 1,
  kind: 'paper',
  title: 'The Question Concerning Technology',
  url: 'https://doi.org/10.1234/qct',
  snippet: 'Heidegger on Gestell.',
  source: 'Harper & Row',
  authors: ['Martin Heidegger', 'William Lovitt'],
  year: 1977,
  venue: 'Harper & Row',
  citationCount: 1200,
  doi: '10.1234/qct',
  pdfUrl: 'https://oa.example/qct.pdf',
  verified: true,
}
const entry: WebCitation = {
  id: 2,
  kind: 'encyclopedia',
  title: 'Martin Heidegger',
  url: 'https://plato.stanford.edu/entries/heidegger/',
  snippet: 'SEP entry excerpt.',
  source: 'SEP',
  venue: 'Stanford Encyclopedia of Philosophy',
}
const unverified: WebCitation = {
  id: 3,
  kind: 'paper',
  title: 'DOI 10.5555/fake.2',
  url: 'https://doi.org/10.5555/fake.2',
  snippet: 'Cited in the answer but not found.',
  doi: '10.5555/fake.2',
  verified: false,
}
const legacyWeb: WebCitation = { id: 1, title: 'Old site', url: 'https://old.example/page', snippet: 'Stored before step 2.' }

describe('SourcesPanel', () => {
  let container: HTMLDivElement
  let root: Root
  beforeEach(() => {
    Object.assign(globalThis, { ResizeObserver: RO })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (el: React.ReactElement) => act(() => root.render(el))
  const buttons = () => Array.from(container.querySelectorAll('button, a')).map((b) => b.textContent?.trim())

  it('labels counts by kind (papers / encyclopedia entries / websites / mixed)', () => {
    expect(sourcesCountLabel([paper])).toBe('1 paper')
    expect(sourcesCountLabel([paper, entry])).toBe('1 paper · 1 encyclopedia entry')
    expect(sourcesCountLabel([legacyWeb])).toBe('1 website')
    expect(sourcesCountLabel([paper, { ...legacyWeb, id: 9, kind: 'web' }])).toBe('2 sources')
  })

  it('renders an academic card: meta line, OA tag, PDF / DOI / Copy APA / Add to notebook', async () => {
    const onAdd = vi.fn(async () => true)
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<SourcesPanel citations={[paper, entry, unverified]} onClose={() => undefined} onAddToNotebook={onAdd} />)
    const detail = container.querySelector('[data-testid="source-detail"]') as HTMLElement
    expect(detail.textContent).toContain('The Question Concerning Technology')
    expect(detail.textContent).toContain('Martin Heidegger, William Lovitt · 1977 · Harper & Row')
    expect(detail.textContent).toContain('Open access')
    expect(detail.textContent).toContain('Cited by 1,200')
    expect(container.textContent).toContain('2 papers · 1 encyclopedia entry')
    const labels = buttons()
    expect(labels).toEqual(expect.arrayContaining(['PDF', 'DOI', 'Copy APA', 'Add to notebook']))
    const pdf = Array.from(detail.querySelectorAll('a')).find((a) => a.textContent?.trim() === 'PDF') as HTMLAnchorElement
    expect(pdf.href).toBe('https://oa.example/qct.pdf')
    const doi = Array.from(detail.querySelectorAll('a')).find((a) => a.textContent?.trim() === 'DOI') as HTMLAnchorElement
    expect(doi.href).toBe('https://doi.org/10.1234/qct')

    const copy = Array.from(detail.querySelectorAll('button')).find((b) => b.textContent?.includes('Copy APA')) as HTMLButtonElement
    await act(async () => copy.click())
    expect(writeText).toHaveBeenCalledWith(
      'Heidegger, M., & Lovitt, W. (1977). The Question Concerning Technology. Harper & Row. https://doi.org/10.1234/qct'
    )
    expect(detail.textContent).toContain('Copied')

    const add = Array.from(detail.querySelectorAll('button')).find((b) => b.textContent?.includes('Add to notebook')) as HTMLButtonElement
    await act(async () => add.click())
    expect(onAdd).toHaveBeenCalledWith(paper)
  })

  it('opens the source requested by an inline marker and marks encyclopedia / unverified items', () => {
    render(<SourcesPanel citations={[paper, entry, unverified]} initialActiveId={2} onClose={() => undefined} />)
    const detail = container.querySelector('[data-testid="source-detail"]') as HTMLElement
    expect(detail.textContent).toContain('Encyclopedia entry')
    expect(detail.textContent).toContain('Open entry')
    expect(detail.textContent).not.toContain('PDF')
    expect(buttons()).not.toContain('Add to notebook') // no handler → hidden
    render(<SourcesPanel citations={[paper, entry, unverified]} initialActiveId={3} onClose={() => undefined} />)
    expect((container.querySelector('[data-testid="source-detail"]') as HTMLElement).textContent).toContain('Unverified')
    const listText = container.querySelector('ul')?.textContent || ''
    expect(listText).toContain('Unverified')
  })

  it('never nests a link inside a button; the row link still opens the source and the row still selects', () => {
    render(<SourcesPanel citations={[paper, entry, unverified]} onClose={() => undefined} />)
    expect(container.querySelectorAll('button a, a button').length).toBe(0)
    const rows = Array.from(container.querySelectorAll('ul > li'))
    expect(rows).toHaveLength(3)
    const link = rows[1].querySelector('a[aria-label="Open source"]') as HTMLAnchorElement
    expect(link.href).toBe('https://plato.stanford.edu/entries/heidegger/')
    expect(link.parentElement?.tagName).toBe('LI')
    const select = rows[1].querySelector('button') as HTMLButtonElement
    act(() => select.click())
    expect((container.querySelector('[data-testid="source-detail"]') as HTMLElement).textContent).toContain('SEP entry excerpt.')
    expect(rows[1].className).toContain('bg-accent')
    expect(select.getAttribute('aria-current')).toBe('true')
  })

  it('shows a Retracted tag (same tag style) on the card and in the list', () => {
    const retracted: WebCitation = { ...paper, id: 4, title: 'RETRACTED: Ileal-lymphoid-nodular hyperplasia', retracted: true, pdfUrl: undefined }
    render(<SourcesPanel citations={[retracted, paper]} onClose={() => undefined} />)
    const detail = container.querySelector('[data-testid="source-detail"]') as HTMLElement
    const tag = Array.from(detail.querySelectorAll('span')).find((el) => el.textContent === 'Retracted') as HTMLElement
    expect(tag).toBeTruthy()
    const oaTagClass = 'inline-flex items-center rounded border border-primary px-1.5 py-px text-[10.5px] leading-4 text-secondary'
    expect(tag.className).toBe(oaTagClass)
    const rows = Array.from(container.querySelectorAll('ul > li'))
    expect(rows[0].textContent).toContain('Retracted')
    expect(rows[1].textContent).not.toContain('Retracted')
  })

  it('keeps the legacy website layout for old stored citations', () => {
    render(<SourcesPanel citations={[legacyWeb]} onClose={() => undefined} />)
    expect(container.textContent).toContain('1 website')
    expect(container.textContent).toContain('Open site')
    expect(container.textContent).toContain('old.example')
    expect(container.textContent).not.toContain('Copy APA')
  })
})
