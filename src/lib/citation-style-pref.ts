/**
 * The user's reference style (APA / MLA / Chicago), stored in this browser only
 * (localStorage; never synced to Supabase). Shared by the Sources panel, notebook
 * adds, whole-reply footnotes and the chat request (annotated_bibliography).
 */
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_CITATION_STYLE, parseCitationStyle, type CitationStyle } from './ai/citation-styles'

export const CITATION_STYLE_STORAGE_KEY = 'wim_citation_style_v1'
export const CITATION_STYLE_EVENT = 'wimCitationStyleChange'

export function getCitationStyle(): CitationStyle {
    try {
        if (typeof window === 'undefined') return DEFAULT_CITATION_STYLE
        return parseCitationStyle(window.localStorage.getItem(CITATION_STYLE_STORAGE_KEY))
    } catch {
        return DEFAULT_CITATION_STYLE
    }
}

export function setCitationStyle(style: CitationStyle): void {
    const next = parseCitationStyle(style)
    try {
        window.localStorage.setItem(CITATION_STYLE_STORAGE_KEY, next)
    } catch {
        /* private mode: still update this page */
    }
    try {
        window.dispatchEvent(new CustomEvent(CITATION_STYLE_EVENT, { detail: { style: next } }))
    } catch {
        /* SSR */
    }
}

/** Current style + setter; follows changes from other panels and other tabs. */
export function useCitationStyle(): [CitationStyle, (style: CitationStyle) => void] {
    const [style, setStyle] = useState<CitationStyle>(DEFAULT_CITATION_STYLE)
    useEffect(() => {
        setStyle(getCitationStyle())
        const sync = () => setStyle(getCitationStyle())
        const onStorage = (event: StorageEvent) => {
            if (event.key === CITATION_STYLE_STORAGE_KEY) sync()
        }
        window.addEventListener(CITATION_STYLE_EVENT, sync)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener(CITATION_STYLE_EVENT, sync)
            window.removeEventListener('storage', onStorage)
        }
    }, [])
    const update = useCallback((next: CitationStyle) => {
        setCitationStyle(next)
        setStyle(parseCitationStyle(next))
    }, [])
    return [style, update]
}
