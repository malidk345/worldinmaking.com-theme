/**
 * Shared mermaid loader.
 *
 * Import mermaid from this module only. Notebook-app webpack used to rewrite
 * `import('mermaid')` to a Lemon UI stub, which made diagrams fail silently.
 * This file lives outside notebook-app so the real package is resolved.
 */

import { mermaidThemeVariables, readHostChrome } from './chrome'

export const MERMAID_DIAGRAM_START =
    /^(?:flowchart(?:-elk)?|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|gitGraph|mindmap|timeline|journey|quadrantChart|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|sankey-beta|xychart-beta|block-beta|packet-beta|architecture-beta|kanban|radar-beta|treemap-beta)\b/

const DIAGRAM_REQUEST_EN =
    /\b(mermaid|flowchart|sequence\s*diagram|class\s*diagram|state\s*diagram|er\s*diagram|git\s*graph|mindmap|gantt(?:\s*chart)?|timeline\s*diagram)\b/i
const DIAGRAM_REQUEST_TR =
    /(diyagram|akış\s*şemas[ıi]|akis\s*semasi|şema\s*(?:çiz|ciz|oluştur|olustur)|sema\s*(?:ciz|olustur))/i

export interface MermaidApi {
    initialize: (config: Record<string, unknown>) => void
    render: (id: string, code: string, container?: Element) => Promise<{ svg: string }>
}

export function isDiagramRequest(prompt: string): boolean {
    const text = String(prompt || '')
    return DIAGRAM_REQUEST_EN.test(text) || DIAGRAM_REQUEST_TR.test(text)
}

export function isMermaidLanguage(language?: string | null): boolean {
    return /^(mermaid)$/i.test(String(language || '').trim())
}

export function cleanMermaidSource(code: string): string {
    let text = String(code || '')
        .replace(/\r\n/g, '\n')
        .trim()
    text = text.replace(/^```(?:mermaid)?[ \t]*\n?/i, '')
    text = text.replace(/\n```[ \t]*$/i, '')
    return text.trim()
}

export function isMermaidSource(code: string): boolean {
    const clean = cleanMermaidSource(code)
    if (!clean) return false
    const stripped = clean
        .replace(/^%%\{[\s\S]*?\}%%\s*/g, '')
        .replace(/^(?:%%[^\n]*\n)+/, '')
        .trim()
    return MERMAID_DIAGRAM_START.test(stripped)
}

export function artifactLooksLikeMermaid(artifact: {
    type?: string
    language?: string
    content?: string
}): boolean {
    if (artifact.type === 'mermaid' || isMermaidLanguage(artifact.language)) return true
    return isMermaidSource(String(artifact.content || ''))
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
    if (!cached) {
        cached = import('mermaid')
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
