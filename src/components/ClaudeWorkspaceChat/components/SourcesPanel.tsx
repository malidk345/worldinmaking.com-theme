import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Download, ExternalLink, FileInput, FileText, Link2, X } from 'lucide-react'
import type { ArtifactOrigin, WebCitation } from '../types'
import { citationHostname } from '../utils/citationMeta'
import { citationDoiUrl, citationMetaLine, isAcademicCitation } from '../../../lib/ai/citation-format'
import { CITATION_STYLES, citationStyleLabel, formatReference, type CitationStyle } from '../../../lib/ai/citation-styles'
import { citationExportFile, downloadCitationFile, type CitationExportFormat } from '../../../lib/ai/citation-export'
import { useCitationStyle } from '../../../lib/citation-style-pref'
import { LemonSelect } from '../../../notebook-app/lib/lemon-ui/LemonSelect/LemonSelect'
import { SourceFavicon } from './SourceFavicon'

interface SourcesPanelProps {
  citations: WebCitation[]
  origin?: ArtifactOrigin | null
  /** Source to select first (e.g. an inline [3] marker was clicked). */
  initialActiveId?: number | null
  /** Adds the source's reference (chosen style) to the notebook (footnote on the selection, else appended). */
  onAddToNotebook?: (citation: WebCitation) => Promise<boolean> | boolean | void
  onClose: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function safeExternalUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

/** "5 papers · 1 encyclopedia entry", "3 websites", or "6 sources" when mixed. */
export function sourcesCountLabel(citations: WebCitation[]): string {
  const papers = citations.filter((c) => c.kind === 'paper').length
  const entries = citations.filter((c) => c.kind === 'encyclopedia').length
  const uploads = citations.filter((c) => c.kind === 'upload').length
  const other = citations.length - papers - entries - uploads
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  if (papers + entries + uploads === 0) return plural(citations.length, 'website', 'websites')
  if (other > 0 || (uploads > 0 && papers + entries > 0)) return plural(citations.length, 'source', 'sources')
  const parts: string[] = []
  if (papers) parts.push(plural(papers, 'paper', 'papers'))
  if (entries) parts.push(plural(entries, 'encyclopedia entry', 'encyclopedia entries'))
  if (uploads) parts.push(plural(uploads, 'uploaded file', 'uploaded files'))
  return parts.join(' · ')
}

const actionClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary px-2.5 py-1 text-[12px] text-primary hover:bg-accent transition-colors cursor-pointer'
const tagClass = 'inline-flex items-center rounded border border-primary px-1.5 py-px text-[10.5px] leading-4 text-secondary'

function CitationTags({ citation }: { citation: WebCitation }) {
  const oa = Boolean(citation.pdfUrl || citation.oaUrl) && citation.kind === 'paper'
  const tags: React.ReactNode[] = []
  if (citation.retracted) {
    tags.push(
      <span key="retracted" className={tagClass} title="This work has been retracted — do not rely on its findings">
        Retracted
      </span>
    )
  }
  if (citation.kind === 'encyclopedia') tags.push(<span key="enc" className={tagClass}>Encyclopedia entry</span>)
  if (citation.kind === 'upload') tags.push(<span key="upload" className={tagClass}>Uploaded file</span>)
  if (oa) tags.push(<span key="oa" className={tagClass} title="Open access">Open access</span>)
  if (typeof citation.citationCount === 'number' && citation.citationCount > 0) {
    tags.push(
      <span key="cites" className="text-[11px] text-secondary">
        Cited by {citation.citationCount.toLocaleString('en-US')}
      </span>
    )
  }
  if (citation.verified === false) {
    tags.push(
      <span key="unverified" className="text-[11px] text-secondary italic" title="Cited in the answer but not found in this turn’s sources or Crossref">
        Unverified
      </span>
    )
  }
  if (tags.length === 0) return null
  return <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{tags}</div>
}

/** Sources worth exporting: everything except references the verifier could not find. */
export function exportableSources(citations: WebCitation[]): WebCitation[] {
  return citations.filter((c) => c.verified !== false)
}

function exportBaseName(): string {
  return `sources-${new Date().toISOString().slice(0, 10)}`
}

function SourcesToolbar({
  citations,
  style,
  onStyleChange,
  showStyle,
}: {
  citations: WebCitation[]
  style: CitationStyle
  onStyleChange: (style: CitationStyle) => void
  showStyle: boolean
}) {
  const [done, setDone] = useState<CitationExportFormat | null>(null)
  const items = exportableSources(citations)
  const skipped = citations.length - items.length
  const exportAs = (format: CitationExportFormat) => {
    if (!items.length) return
    if (downloadCitationFile(citationExportFile(items, format, exportBaseName()))) {
      setDone(format)
      setTimeout(() => setDone(null), 2000)
    }
  }
  const exportTitle = (label: string) =>
    `Download ${items.length === 1 ? '1 source' : `${items.length} sources`} as ${label} (Zotero, Mendeley, EndNote)` +
    (skipped ? ` — ${skipped} unverified skipped` : '')
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-primary bg-primary px-3 py-1.5"
      data-testid="sources-toolbar"
    >
      {showStyle ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-secondary">
          Style
          <LemonSelect
            size="xsmall"
            value={style}
            onChange={(value) => value && onStyleChange(value)}
            options={CITATION_STYLES.map((option) => ({ value: option.value, label: option.long }))}
            renderButtonContent={() => <span className="text-[12px] text-primary">{citationStyleLabel(style)}</span>}
            dropdownMatchSelectWidth={false}
            data-attr="sources-citation-style"
          />
        </span>
      ) : null}
      <span className="ml-auto" />
      <button type="button" className={`${actionClass} disabled:cursor-default disabled:opacity-50`} disabled={!items.length} onClick={() => exportAs('bibtex')} title={exportTitle('BibTeX')}>
        {done === 'bibtex' ? <Check className="h-3 w-3" /> : <Download className="h-3 w-3" />}
        BibTeX
      </button>
      <button type="button" className={`${actionClass} disabled:cursor-default disabled:opacity-50`} disabled={!items.length} onClick={() => exportAs('ris')} title={exportTitle('RIS')}>
        {done === 'ris' ? <Check className="h-3 w-3" /> : <Download className="h-3 w-3" />}
        RIS
      </button>
    </div>
  )
}

function AcademicActions({
  citation,
  style,
  onAddToNotebook,
}: {
  citation: WebCitation
  style: CitationStyle
  onAddToNotebook?: SourcesPanelProps['onAddToNotebook']
}) {
  const [copied, setCopied] = useState(false)
  const [added, setAdded] = useState(false)
  useEffect(() => {
    setCopied(false)
    setAdded(false)
  }, [citation.id, style])

  const pdfHref = safeExternalUrl(citation.pdfUrl || citation.oaUrl)
  const doiHref = safeExternalUrl(citationDoiUrl(citation))
  const openHref = safeExternalUrl(citation.url)
  const showOpen = openHref && openHref !== doiHref && openHref !== pdfHref

  const copyReference = async () => {
    const text = formatReference(citation, style)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  // "Added" only after the notebook confirmed it (the handler resolves false on a nack,
  // a duplicate or a timeout and shows its own message).
  const [adding, setAdding] = useState(false)
  const addToNotebook = async () => {
    if (!onAddToNotebook || adding) return
    setAdding(true)
    let ok: boolean | void = false
    try {
      ok = await onAddToNotebook(citation)
    } finally {
      setAdding(false)
    }
    if (ok !== false) {
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {pdfHref && citation.kind === 'paper' ? (
        <a href={pdfHref} target="_blank" rel="noreferrer" className={actionClass}>
          <FileText className="h-3 w-3" />
          {citation.pdfUrl ? 'PDF' : 'Full text'}
        </a>
      ) : null}
      {doiHref ? (
        <a href={doiHref} target="_blank" rel="noreferrer" className={actionClass}>
          <Link2 className="h-3 w-3" />
          DOI
        </a>
      ) : null}
      {showOpen ? (
        <a href={openHref} target="_blank" rel="noreferrer" className={actionClass}>
          <ExternalLink className="h-3 w-3" />
          {citation.kind === 'encyclopedia' ? 'Open entry' : 'Open'}
        </a>
      ) : null}
      <button type="button" onClick={copyReference} className={actionClass} title={`Copy ${citationStyleLabel(style)} reference`}>
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : `Copy ${citationStyleLabel(style)}`}
      </button>
      {onAddToNotebook ? (
        <button
          type="button"
          onClick={addToNotebook}
          disabled={adding}
          className={actionClass}
          title="Add as a footnote on the selected notebook text, or append to the notebook"
        >
          {added ? <Check className="h-3 w-3" /> : <FileInput className="h-3 w-3" />}
          {added ? 'Added' : adding ? 'Adding…' : 'Add to notebook'}
        </button>
      ) : null}
    </div>
  )
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  citations,
  origin = null,
  initialActiveId = null,
  onAddToNotebook,
  onClose,
}) => {
  const frameRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [host, setHost] = useState({ width: 400, height: 720 })
  const pickInitial = () =>
    (initialActiveId != null && citations.some((c) => c.id === initialActiveId) ? initialActiveId : citations[0]?.id)
  const [activeId, setActiveId] = useState(pickInitial)
  const [style, setStyle] = useCitationStyle()

  useEffect(() => {
    setActiveId(pickInitial())
  }, [citations, initialActiveId])

  useEffect(() => {
    const parent = frameRef.current?.parentElement
    if (!parent) return
    const update = () => setHost({ width: parent.clientWidth, height: parent.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [citations.length])

  useEffect(() => {
    const item = listRef.current?.querySelector<HTMLElement>(`[data-source-id="${activeId}"]`)
    item?.scrollIntoView?.({ block: 'nearest' })
  }, [activeId])

  if (citations.length === 0) return null

  const active = citations.find((item) => item.id === activeId) || citations[0]
  const academic = isAcademicCitation(active)
  const href = safeExternalUrl(active.url)
  const hostName = citationHostname(active.url)
  const anyAcademic = citations.some(isAcademicCitation)

  const compactHeight = Math.min(anyAcademic ? 480 : 420, Math.round(host.height * (anyAcademic ? 0.66 : 0.56)))
  const targetHeight = compactHeight
  const targetWidth = Math.max(host.width - 20, 220)
  const targetLeft = 10
  const centerY = origin?.centerY ?? host.height * 0.48
  const targetTop = clamp(centerY - targetHeight / 2, 48, Math.max(48, host.height - targetHeight - 12))
  const initialFrame = origin
    ? { top: origin.top, left: origin.left, width: origin.width, height: origin.height }
    : { top: centerY - 32, left: targetLeft, width: targetWidth, height: 64 }

  return (
    <>
      <motion.button
        type="button"
        aria-label="Close sources"
        className="absolute inset-0 z-40 cursor-default bg-black/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.div
        ref={frameRef}
        data-testid="sources-panel"
        className="absolute z-50 flex flex-col overflow-hidden rounded-2xl border border-primary bg-primary text-primary font-sans shadow-xl"
        initial={initialFrame}
        animate={{ top: targetTop, left: targetLeft, width: targetWidth, height: targetHeight }}
        transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.85 }}
      >
        <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-primary bg-primary px-3 font-sans select-none text-primary">
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-medium text-primary">Sources</div>
            <div className="text-[11px] text-secondary">{sourcesCountLabel(citations)}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-secondary hover:bg-accent hover:text-primary cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <SourcesToolbar citations={citations} style={style} onStyleChange={setStyle} showStyle={anyAcademic} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-primary px-4 py-3" data-testid="source-detail">
            <div className="flex items-start gap-3">
              {academic ? (
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary text-[12px] font-medium text-secondary">
                  {active.id}
                </span>
              ) : (
                <SourceFavicon citation={active} size={28} className="mt-0.5 shrink-0 border border-primary" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium leading-snug text-primary">{active.title}</div>
                {academic ? (
                  citationMetaLine(active) ? (
                    <div className="mt-0.5 text-[12px] text-secondary">{citationMetaLine(active)}</div>
                  ) : null
                ) : hostName ? (
                  <div className="mt-0.5 text-[12px] text-secondary">{hostName}</div>
                ) : null}
                {academic || active.verified === false ? <CitationTags citation={active} /> : null}
                {active.snippet ? (
                  <p className="mt-2 text-[13px] leading-relaxed text-secondary">{active.snippet}</p>
                ) : null}
                {academic ? (
                  <AcademicActions citation={active} style={style} onAddToNotebook={onAddToNotebook} />
                ) : href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary px-2.5 py-1 text-[12px] text-primary hover:bg-accent transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open site
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <ul className="py-1" ref={listRef}>
            {citations.map((citation) => {
              const itemHref = safeExternalUrl(citation.url)
              const selected = citation.id === active.id
              const itemAcademic = isAcademicCitation(citation)
              const meta = itemAcademic ? citationMetaLine(citation) : ''
              const oa = citation.kind === 'paper' && Boolean(citation.pdfUrl || citation.oaUrl)
              return (
                // Row = select button + sibling external link (no <a> nested in <button>);
                // the row background / hover lives on the <li> so the look is unchanged.
                <li
                  key={citation.id}
                  data-source-id={citation.id}
                  className={`flex w-full items-center gap-2.5 pr-4 transition-colors ${
                    selected ? 'bg-accent text-primary' : 'hover:bg-accent text-primary'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveId(citation.id)}
                    aria-current={selected ? 'true' : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-4 text-left cursor-pointer"
                  >
                    {itemAcademic ? (
                      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-primary text-[10px] text-secondary">
                        {citation.id}
                      </span>
                    ) : (
                      <SourceFavicon citation={citation} size={18} className="shrink-0 border border-primary" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-primary">{citation.title}</span>
                      <span className="block truncate text-[11px] text-secondary">
                        {itemAcademic
                          ? [
                              citation.retracted ? 'Retracted' : '',
                              citation.kind === 'encyclopedia' ? 'Encyclopedia' : '',
                              meta,
                              oa ? 'Open access' : '',
                              citation.verified === false ? 'Unverified' : '',
                            ]
                              .filter(Boolean)
                              .join(' · ') || citation.source || ''
                          : citationHostname(citation.url) || citation.source || ''}
                      </span>
                    </span>
                  </button>
                  {itemHref ? (
                    <a
                      href={itemHref}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded p-1 text-secondary hover:text-primary"
                      aria-label="Open source"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      </motion.div>
    </>
  )
}
