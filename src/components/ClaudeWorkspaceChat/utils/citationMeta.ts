import type { WebCitation } from '../types'

export function citationHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function citationFaviconUrl(url: string): string | null {
  const host = citationHostname(url)
  if (!host) return null
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`
}

export function citationInitial(citation: Pick<WebCitation, 'title' | 'url'>): string {
  const host = citationHostname(citation.url)
  const seed = host || citation.title || '?'
  return seed.slice(0, 1).toUpperCase()
}
