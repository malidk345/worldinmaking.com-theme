import React from 'react'
import { IconGlobe, IconExternal } from '@posthog/icons'
import { LemonTag } from '~nb-lib/lemon-ui/index'

export interface WebSearchSource {
    title: string
    url?: string
    domain: string
}

export interface WebSearchSourcesViewProps {
    query: string
    results?: string | null
    status: 'running' | 'done'
}

/**
 * Helper to parse source domain or markdown links out of raw search result strings
 */
function parseSources(resultsText?: string | null): WebSearchSource[] {
    if (!resultsText) return []
    const sources: WebSearchSource[] = []
    
    // Match markdown links [Title](https://domain.com) or raw URLs
    const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
    let match: RegExpExecArray | null
    const seen = new Set<string>()

    while ((match = mdLinkRegex.exec(resultsText)) !== null) {
        const title = match[1]?.trim() || 'Source'
        const url = match[2]
        try {
            const parsedUrl = new URL(url)
            const domain = parsedUrl.hostname.replace(/^www\./, '')
            if (!seen.has(url)) {
                seen.add(url)
                sources.push({ title, url, domain })
            }
        } catch {
            // fallback if invalid URL
        }
    }

    if (sources.length === 0) {
        // Fallback: extract domain-like strings or use query as single tag
        const urlMatches = resultsText.match(/https?:\/\/[^\s,)]+/g)
        if (urlMatches) {
            urlMatches.forEach((url) => {
                try {
                    const parsedUrl = new URL(url)
                    const domain = parsedUrl.hostname.replace(/^www\./, '')
                    if (!seen.has(url)) {
                        seen.add(url)
                        sources.push({ title: domain, url, domain })
                    }
                } catch {/* ignore */ }
            })
        }
    }

    return sources.slice(0, 5)
}

export function WebSearchSourcesView({ query, results, status }: WebSearchSourcesViewProps): JSX.Element {
    const sources = parseSources(results)
    const isRunning = status === 'running'

    return (
        <div className="flex flex-col gap-1.5 my-2 px-3 py-2 rounded-lg bg-bg-light/60 dark:bg-accent-dark/40 border border-primary/40 text-xs">
            <div className="flex items-center gap-2 text-muted font-medium text-[11px]">
                <IconGlobe className={`w-3.5 h-3.5 text-link ${isRunning ? 'animate-spin' : ''}`} />
                <span>{isRunning ? `Searching web for "${query}"…` : `Web sources for "${query}"`}</span>
            </div>

            {!isRunning && sources.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {sources.map((src, idx) => (
                        <a
                            key={idx}
                            href={src.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="no-underline group"
                        >
                            <LemonTag type="completion" className="flex items-center gap-1 py-0.5 px-2 bg-primary/10 hover:bg-primary/20 transition-colors text-[11px]">
                                <img
                                    src={`https://www.google.com/s2/favicons?domain=${src.domain}&sz=32`}
                                    alt=""
                                    className="w-3 h-3 rounded-full opacity-80 group-hover:opacity-100"
                                    onError={(e) => {
                                        ;(e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                />
                                <span className="font-medium text-primary truncate max-w-[120px]">{src.title}</span>
                                <IconExternal className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                            </LemonTag>
                        </a>
                    ))}
                </div>
            )}
        </div>
    )
}
