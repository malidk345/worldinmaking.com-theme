import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, X } from 'lucide-react'
import type { ArtifactOrigin, WebCitation } from '../types'
import { citationHostname } from '../utils/citationMeta'
import { SourceFavicon } from './SourceFavicon'

interface SourcesPanelProps {
  citations: WebCitation[]
  origin?: ArtifactOrigin | null
  onClose: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({ citations, origin = null, onClose }) => {
  const frameRef = useRef<HTMLDivElement>(null)
  const [host, setHost] = useState({ width: 400, height: 720 })
  const [activeId, setActiveId] = useState(citations[0]?.id)

  useEffect(() => {
    setActiveId(citations[0]?.id)
  }, [citations])

  useEffect(() => {
    const parent = frameRef.current?.parentElement
    if (!parent) return
    const update = () => setHost({ width: parent.clientWidth, height: parent.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [citations.length])

  if (citations.length === 0) return null

  const active = citations.find((item) => item.id === activeId) || citations[0]
  const href = safeExternalUrl(active.url)
  const hostName = citationHostname(active.url)

  const compactHeight = Math.min(420, Math.round(host.height * 0.56))
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
        className="absolute z-50 flex flex-col overflow-hidden rounded-2xl border border-primary bg-primary text-primary font-sans shadow-xl"
        initial={initialFrame}
        animate={{ top: targetTop, left: targetLeft, width: targetWidth, height: targetHeight }}
        transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.85 }}
      >
        <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-primary bg-primary px-3 font-sans select-none text-primary">
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-medium text-primary">Sources</div>
            <div className="text-[11px] text-secondary">
              {citations.length} {citations.length === 1 ? 'website' : 'websites'}
            </div>
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
          <div className="border-b border-primary px-4 py-3">
            <div className="flex items-start gap-3">
              <SourceFavicon citation={active} size={28} className="mt-0.5 shrink-0 border border-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium leading-snug text-primary">{active.title}</div>
                {hostName ? <div className="mt-0.5 text-[12px] text-secondary">{hostName}</div> : null}
                {active.snippet ? (
                  <p className="mt-2 text-[13px] leading-relaxed text-secondary">{active.snippet}</p>
                ) : null}
                {href ? (
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

          <ul className="py-1">
            {citations.map((citation) => {
              const itemHref = safeExternalUrl(citation.url)
              const selected = citation.id === active.id
              return (
                <li key={citation.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(citation.id)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-left cursor-pointer transition-colors ${
                      selected ? 'bg-accent text-primary' : 'hover:bg-accent text-primary'
                    }`}
                  >
                    <SourceFavicon citation={citation} size={18} className="shrink-0 border border-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-primary">{citation.title}</span>
                      <span className="block truncate text-[11px] text-secondary">
                        {citationHostname(citation.url) || citation.source || ''}
                      </span>
                    </span>
                    {itemHref ? (
                      <a
                        href={itemHref}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="shrink-0 rounded p-1 text-secondary hover:text-primary"
                        aria-label="Open source"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </motion.div>
    </>
  )
}
