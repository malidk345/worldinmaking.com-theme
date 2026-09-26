import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SourcesPanel, sourcesCountLabel } from './SourcesPanel'
import type { WebCitation } from '../types'
import { CITATION_STYLE_STORAGE_KEY } from '../../../lib/citation-style-pref'

// The real LemonSelect pulls notebook-app path aliases vitest does not resolve; a native
// <select> with the same value/options/onChange contract is enough here.
vi.mock('../../../notebook-app/lib/lemon-ui/LemonSelect/LemonSelect', () => ({
  LemonSelect: (props: { value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void }) => (
    <select data-testid="style-select" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

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
    window.localStorage.removeItem(CITATION_STYLE_STORAGE_KEY)
  })

  const render = (el: React.ReactElement) => act(() => root.render(el))
  const buttons = () => Array.from(container.querySelectorAll('button, a')).map((b) => b.textContent?.trim())

  it('labels counts by kind (papers / encyclopedia entries / websites / mixed)', () => {
    expect(sourcesCountLabel([paper])).toBe('1 paper')
    expect(sourcesCountLabel([paper, entry])).toBe('1 paper · 1 encyclopedia entry')
    expect(sourcesCountLabel([legacyWeb])).toBe('1 website')
    expect(sourcesCountLabel([{ ...legacyWeb, id: 8, kind: 'upload', title: 'notes.pdf' }])).toBe('1 uploaded file')
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

  it('shows "Added" only after the notebook confirmed it; "Adding…" while waiting', async () => {
    let resolveAdd: (ok: boolean) => void = () => undefined
    const onAdd = vi.fn(() => new Promise<boolean>((resolve) => { resolveAdd = resolve }))
    render(<SourcesPanel citations={[paper]} onClose={() => undefined} onAddToNotebook={onAdd} />)
    const detail = container.querySelector('[data-testid="source-detail"]') as HTMLElement
    const add = () => Array.from(detail.querySelectorAll('button')).find((b) => /Add|Adding/.test(b.textContent || '') && !b.textContent?.includes('Copy')) as HTMLButtonElement
    await act(async () => add().click())
    expect(add().textContent).toContain('Adding…')
    expect(add().disabled).toBe(true)
    await act(async () => add().click()) // double click while pending does nothing
    expect(onAdd).toHaveBeenCalledTimes(1)
    await act(async () => resolveAdd(false)) // notebook rejected it
    expect(add().textContent).toContain('Add to notebook')
    expect(detail.textContent).not.toContain('Added')
    await act(async () => add().click())
    await act(async () => resolveAdd(true))
    expect(detail.textContent).toContain('Added')
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

  it('copies in the saved style; the Style selector switches APA / MLA / Chicago and persists it', async () => {
    window.localStorage.setItem(CITATION_STYLE_STORAGE_KEY, 'mla')
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<SourcesPanel citations={[paper, entry]} onClose={() => undefined} />)
    await act(async () => undefined)
    const copyButton = () => Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.startsWith('Copy')) as HTMLButtonElement
    expect(copyButton().textContent).toBe('Copy MLA')
    await act(async () => copyButton().click())
    expect(writeText).toHaveBeenLastCalledWith(
      'Heidegger, Martin, and William Lovitt. “The Question Concerning Technology.” Harper & Row, 1977, https://doi.org/10.1234/qct.'
    )
    const select = container.querySelector('[data-testid="style-select"]') as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['APA 7', 'MLA 9', 'Chicago (author-date)'])
    await act(async () => {
      select.value = 'chicago'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(window.localStorage.getItem(CITATION_STYLE_STORAGE_KEY)).toBe('chicago')
    expect(copyButton().textContent).toBe('Copy Chicago')
    await act(async () => copyButton().click())
    expect(writeText).toHaveBeenLastCalledWith(
      'Heidegger, Martin, and William Lovitt. 1977. “The Question Concerning Technology.” Harper & Row. https://doi.org/10.1234/qct.'
    )
  })

  it('exports every verified source of the reply as BibTeX or RIS, client-side', async () => {
    const blobs: Blob[] = []
    const downloads: string[] = []
    Object.assign(URL, { createObjectURL: (b: Blob) => (blobs.push(b), 'blob:x'), revokeObjectURL: () => undefined })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download)
    })
    const readBlob = (b: Blob) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.readAsText(b)
      })
    render(<SourcesPanel citations={[paper, entry, unverified]} onClose={() => undefined} />)
    const toolbar = container.querySelector('[data-testid="sources-toolbar"]') as HTMLElement
    const bib = Array.from(toolbar.querySelectorAll('button')).find((b) => b.textContent?.includes('BibTeX')) as HTMLButtonElement
    expect(bib.title).toContain('2 sources')
    expect(bib.title).toContain('1 unverified skipped')
    await act(async () => bib.click())
    const ris = Array.from(toolbar.querySelectorAll('button')).find((b) => b.textContent?.includes('RIS')) as HTMLButtonElement
    await act(async () => ris.click())
    expect(downloads[0]).toMatch(/^sources-\d{4}-\d{2}-\d{2}\.bib$/)
    expect(downloads[1]).toMatch(/\.ris$/)
    const bibText = await readBlob(blobs[0])
    expect(bibText).toContain('@article{heidegger1977question,')
    expect(bibText).toContain('Stanford Encyclopedia of Philosophy')
    expect(bibText).not.toContain('10.5555/fake.2')
    const risText = await readBlob(blobs[1])
    expect(risText).toContain('TY  - JOUR')
    expect(risText).toContain('TY  - ENCYC')
    expect((risText.match(/ER {2}-/g) || []).length).toBe(2)
    click.mockRestore()
  })

  it('keeps the legacy website layout for old stored citations', () => {
    render(<SourcesPanel citations={[legacyWeb]} onClose={() => undefined} />)
    expect(container.textContent).toContain('1 website')
    expect(container.textContent).toContain('Open site')
    expect(container.textContent).toContain('old.example')
    expect(container.textContent).not.toContain('Copy APA')
    expect(container.querySelector('[data-testid="style-select"]')).toBeNull() // no academic sources → no style picker
    expect(container.querySelector('[data-testid="sources-toolbar"]')?.textContent).toContain('BibTeX')
  })
})
