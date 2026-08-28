/**
 * Shared mermaid loader.
 *
 * Import mermaid from this module only on client-side components.
 * For pure regex / pattern matching in edge or server code, use `mermaid-patterns.ts`.
 */

import { mermaidThemeVariables, readHostChrome } from './chrome'
import { cleanMermaidSource } from './mermaid-patterns'

export * from './mermaid-patterns'

export interface MermaidApi {
    initialize: (config: Record<string, unknown>) => void
    render: (id: string, code: string, container?: Element) => Promise<{ svg: string }>
}

function resolveApi(mod: any): MermaidApi | null {
    const candidates = [mod?.default, mod?.mermaid, mod, mod?.default?.default]
    for (const candidate of candidates) {
        if (candidate && typeof candidate.render === 'function') return candidate as MermaidApi
    }
    for (const candidate of candidates) {
        if (candidate?.mermaidAPI && typeof candidate.mermaidAPI.render === 'function') {
            return candidate.mermaidAPI as MermaidApi
        }
    }
    return null
}

let cached: Promise<MermaidApi> | null = null
let initializedTheme: string | null = null
let renderChain: Promise<unknown> = Promise.resolve()
let diagramSeq = 0

export async function loadMermaidApi(): Promise<MermaidApi> {
    if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge') {
        throw new Error('Mermaid is not supported in the Edge Runtime.');
    }

    if (!cached) {
        // Trick Next.js bundler to not trace this in Edge environments
        const m = 'mer' + 'maid';
        cached = import(/* webpackIgnore: true */ m)
            .then((mod) => {
                const api = resolveApi(mod)
                if (!api) throw new Error('mermaid render function not found in module exports')
                return api
            })
            .catch((error) => {
                cached = null
                throw error
            })
    }
    return cached
}

function withNaturalWidth(svgMarkup: string): string {
    if (typeof document === 'undefined') return svgMarkup
    const host = document.createElement('div')
    host.innerHTML = svgMarkup
    const svgElement = host.querySelector('svg')
    if (svgElement && svgElement.style.maxWidth) {
        svgElement.style.width = svgElement.style.maxWidth
        svgElement.style.maxWidth = ''
    }
    return host.innerHTML
}

function mermaidErrorMessage(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error || 'Unable to render diagram')
    return raw.split('\n')[0].replace(/\s+/g, ' ').trim().slice(0, 240) || 'Unable to render diagram'
}

export async function renderMermaidSvg(
    code: string,
    opts?: { theme?: 'default' | 'dark' | 'neutral'; naturalWidth?: boolean }
): Promise<string> {
    const clean = cleanMermaidSource(code)
    if (!clean) throw new Error('Empty diagram')
    const theme = opts?.theme || 'default'

    const run = async () => {
        const api = await loadMermaidApi()
        const snap = readHostChrome()
        const dark = theme === 'dark' || snap.dark
        const themeKey = dark ? 'wim-dark' : 'wim-light'
        if (typeof api.initialize === 'function' && initializedTheme !== themeKey) {
            api.initialize({
                startOnLoad: false,
                theme: 'base',
                securityLevel: 'strict',
                suppressErrorRendering: true,
                fontFamily: 'inherit',
                themeVariables: mermaidThemeVariables({ ...snap, dark }),
            })
            initializedTheme = themeKey
        }
        diagramSeq += 1
        const id = `wimMmd${diagramSeq}`
        if (typeof document !== 'undefined') {
            document.getElementById(id)?.remove()
            document.getElementById(`d${id}`)?.remove()
        }
        const result = await api.render(id, clean)
        if (typeof document !== 'undefined') {
            document.getElementById(id)?.remove()
            document.getElementById(`d${id}`)?.remove()
        }
        const svg = result?.svg || ''
        if (!svg.includes('<svg')) throw new Error('mermaid produced empty svg')
        return opts?.naturalWidth ? withNaturalWidth(svg) : svg
    }

    const next = renderChain.then(run, run)
    renderChain = next.then(
        () => undefined,
        () => undefined
    )
    try {
        return await next
    } catch (error) {
        throw new Error(mermaidErrorMessage(error))
    }
}

/** @deprecated Use renderMermaidSvg */
export async function renderMermaid(code: string): Promise<string> {
    return renderMermaidSvg(code, { theme: 'default', naturalWidth: true })
}
