import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, ExternalLink, FileInput, FileText, Link2, X } from 'lucide-react'
import type { ArtifactOrigin, WebCitation } from '../types'
import { citationHostname } from '../utils/citationMeta'
import { citationDoiUrl, citationMetaLine, formatApaReference, isAcademicCitation } from '../../../lib/ai/citation-format'
import { SourceFavicon } from './SourceFavicon'

interface SourcesPanelProps {
  citations: WebCitation[]
  origin?: ArtifactOrigin | null
  /** Source to select first (e.g. an inline [3] marker was clicked). */
  initialActiveId?: number | null
  /** Adds the source's APA reference to the notebook (footnote on the selection, else appended). */
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
  const other = citations.length - papers - entries
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  if (papers + entries === 0) return plural(citations.length, 'website', 'websites')
  if (other > 0) return plural(citations.length, 'source', 'sources')
  const parts: string[] = []
  if (papers) parts.push(plural(papers, 'paper', 'papers'))
  if (entries) parts.push(plural(entries, 'encyclopedia entry', 'encyclopedia entries'))
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

function AcademicActions({
  citation,
  onAddToNotebook,
}: {
  citation: WebCitation
  onAddToNotebook?: SourcesPanelProps['onAddToNotebook']
}) {
  const [copied, setCopied] = useState(false)
  const [added, setAdded] = useState(false)
  useEffect(() => {
    setCopied(false)
    setAdded(false)
  }, [citation.id])

  const pdfHref = safeExternalUrl(citation.pdfUrl || citation.oaUrl)
  const doiHref = safeExternalUrl(citationDoiUrl(citation))
  const openHref = safeExternalUrl(citation.url)
  const showOpen = openHref && openHref !== doiHref && openHref !== pdfHref

  const copyApa = async () => {
    const text = formatApaReference(citation)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const addToNotebook = async () => {
    if (!onAddToNotebook) return
    const ok = await onAddToNotebook(citation)
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
      <button type="button" onClick={copyApa} className={actionClass} title="Copy APA reference">
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy APA'}
      </button>
      {onAddToNotebook ? (
        <button
          type="button"
          onClick={addToNotebook}
          className={actionClass}
          title="Add as a footnote on the selected notebook text, or append to the notebook"
        >
          {added ? <Check className="h-3 w-3" /> : <FileInput className="h-3 w-3" />}
          {added ? 'Added' : 'Add to notebook'}
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
                  <AcademicActions citation={active} onAddToNotebook={onAddToNotebook} />
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
