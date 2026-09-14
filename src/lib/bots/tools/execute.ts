import { parseChartSpec, parsePostHogAnalyticsSpec } from '../../ai/chart-artifacts'
import type { AiCitation } from '../../ai/contracts'
import type { ArtifactDocument, ArtifactKind } from '../../artifacts/kinds'
import { artifactContentError } from '../../artifacts/validate-source'
import type { EnvStore } from '../runtime-env'
import { formatSearchResults, searchWebSources } from '../web-search'
import { fetchPublicUrl, isBlockedFetchUrl, assertPublicHostname } from './fetch-url'
import {
    searchAcademicCorpus,
    formatAcademicResults,
    formatApaBibliography,
    type AcademicPaper,
    type AcademicSearchOptions,
} from '../academic-search'
import { executeReadDocument } from './read-document'
import {
    executeAnnotateNotebook,
    executeCreateNotebook,
    executeGetWorkspace,
    executeInsertNotebookBlock,
    executeListNotebooks,
    executeManageWindows,
    executeOpenPath,
    executePublishToForum,
    executeReadNotebook,
    executeReadPost,
    executeReplaceNotebookSelection,
    executeRewriteNotebookDocument,
    executeSearchSite,
    executeSetSystemAppearance,
    executeUpdateNotebookTitle,
    executeAddNotebookFootnote,
    applyRememberedFact,
    type HostOsAction,
    type HostSnapshot,
} from './host'
import { isToolAllowedInMode, parseAgentMode, type AgentMode } from '../agent/modes'
import { toolResultSummary } from './labels'
import { ALLOWED_TOOL_NAMES, ARTIFACT_TOOL_TYPES, type ArtifactToolType } from './spec'
import { searchPhilosophicalCorpus } from './philosophical-corpus'
import { crossExamineArgument } from './argument-cross-examination'
import type { CanvasSpec } from '../../ai/visual-artifacts'
import { repairAndParseJsonObject } from './json-repair'

const MAX_TITLE = 80
const MAX_ARTIFACT_BODY = 120_000
const MAX_SEARCH_QUERY = 300
const MAX_TOOL_RESULT = 4_000
const MAX_READ_RESULT = 8_000

export type ToolCall = {
    id: string
    name: string
    argumentsJson: string
    /** Gemini 3: echo this on the functionCall part of the next request. */
    thoughtSignature?: string
}

export type ToolExecution = {
    callId: string
    name: string
    ok: boolean
    result: string
    summary?: string
    artifact?: ArtifactDocument
    citations?: AiCitation[]
    action?: HostOsAction
}

function clip(value: string, max: number): string {
    const text = String(value || '')
    return text.length <= max ? text : text.slice(0, max)
}

/** Models sometimes pass parsed objects instead of JSON strings. */
function asText(value: unknown, max: number): string {
    if (typeof value === 'string') return clip(value, max)
    if (typeof value === 'number' || typeof value === 'boolean') return clip(String(value), max)
    if (value && typeof value === 'object') return clip(JSON.stringify(value), max)
    return ''
}

const ARG_ALIASES: Record<string, Record<string, string>> = {
    switch_mode: { target: 'mode', supermode: 'mode' },
    web_search: { q: 'query', search: 'query', text: 'query', keywords: 'query' },
    search_site: { q: 'query', search: 'query', text: 'query' },
    fetch_url: { uri: 'url', href: 'url', link: 'url', page: 'url' },
    open_path: { app: 'path', name: 'path', window: 'path', route: 'path' },
    read_post: { id: 'slug', post: 'slug', path: 'slug' },
    create_notebook: { name: 'title', body: 'content', markdown: 'content', text: 'content' },
    insert_notebook_block: {
        text: 'content',
        markdown: 'content',
        body: 'content',
        notebookId: 'notebook_id',
        id: 'notebook_id',
        notebook: 'notebook_id',
    },
    rewrite_notebook_document: {
        text: 'content',
        markdown: 'content',
        body: 'content',
        notebookId: 'notebook_id',
        id: 'notebook_id',
        notebook: 'notebook_id',
    },
    replace_notebook_selection: {
        text: 'content',
        markdown: 'content',
        body: 'content',
        notebookId: 'notebook_id',
        id: 'notebook_id',
        notebook: 'notebook_id',
    },
    update_notebook_title: {
        name: 'title',
        notebookId: 'notebook_id',
        id: 'notebook_id',
        notebook: 'notebook_id',
    },
    manage_windows: {
        target: 'path',
        app: 'path',
        route: 'path',
        left: 'left_path',
        leftPath: 'left_path',
        right: 'right_path',
        rightPath: 'right_path',
    },
    set_system_appearance: {
        mode: 'theme',
        colorMode: 'theme',
        bg: 'wallpaper',
        background: 'wallpaper',
        transparency: 'reduce_transparency',
    },
    annotate_notebook: {
        quote: 'span_text',
        selection: 'span_text',
        text: 'span_text',
        span: 'span_text',
        comment: 'note',
        critique: 'note',
        annotation: 'note',
        notebookId: 'notebook_id',
        id: 'notebook_id',
    },
    publish_to_forum: {
        name: 'title',
        topic: 'title',
        body: 'content',
        markdown: 'content',
        text: 'content',
        tag: 'category',
    },
    add_notebook_footnote: {
        quote: 'span_text',
        selection: 'span_text',
        span: 'span_text',
        target_text: 'span_text',
        target: 'span_text',
        content: 'text',
        note: 'text',
        comment: 'text',
        citation: 'text',
        explanation: 'text',
        id: 'marker',
        fnId: 'marker',
        footnoteId: 'marker',
        notebookId: 'notebook_id',
    },
    create_artifact: { kind: 'type', source: 'content', body: 'content', code: 'content', markdown: 'content' },
    read_document: { doc: 'name', document: 'name', file: 'name', link: 'url', href: 'url', p: 'page', q: 'query' },
    write_scratchpad: { note: 'content', text: 'content', body: 'content', markdown: 'content', ref: 'source', url: 'source', document: 'source' },
    todo_write: { plan: 'tasks', todo: 'tasks', items: 'tasks', list: 'tasks' },
    remember: { memory: 'fact', note: 'fact', text: 'fact', content: 'fact' },
    ask_user: { q: 'question', query: 'question', prompt: 'question', text: 'question' },
    finalize_plan: { text: 'summary', plan: 'summary', description: 'summary' },
    task: { prompt: 'goal', task: 'goal', instruction: 'goal', query: 'goal' },
    generate_image: { p: 'prompt', description: 'prompt', query: 'prompt', text: 'prompt', image_prompt: 'prompt' },
    search_academic_corpus: { q: 'query', search: 'query', text: 'query', topic: 'query', subject: 'field', discipline: 'field' },
    cross_examine_argument: {
        arg: 'argument',
        claim: 'argument',
        thesis: 'argument',
        text: 'argument',
        school: 'philosophical_tradition',
        tradition: 'philosophical_tradition',
        perspective: 'philosophical_tradition',
    },
    verified_corpus_search: {
        q: 'query',
        search: 'query',
        text: 'query',
        term: 'query',
        author: 'philosopher',
        source: 'philosopher',
    },
    arrange_workspace_preset: {
        preset: 'preset_name',
        name: 'preset_name',
        layout: 'preset_name',
        mode: 'preset_name',
    },
    generate_flashcards: {
        cards: 'flashcards',
        deck: 'flashcards',
        items: 'flashcards',
        topic: 'deck_title',
        title: 'deck_title',
        name: 'deck_title',
        save: 'save_to_notebook',
        save_notebook: 'save_to_notebook',
    },
    export_notebook: {
        notebookId: 'notebook_id',
        id: 'notebook_id',
        notebook: 'notebook_id',
        type: 'format',
        as: 'format',
        output: 'format',
        toc: 'include_toc',
        footnotes: 'include_footnotes',
    },
    create_concept_map: {
        name: 'title',
        map_title: 'title',
        elements: 'nodes',
        concepts: 'nodes',
        connections: 'edges',
        links: 'edges',
        relations: 'edges',
    },
}

const ARTIFACT_TYPE_ALIASES: Record<string, ArtifactToolType> = {
    diagram: 'mermaid',
    flowchart: 'mermaid',
    flow: 'mermaid',
    graph: 'posthog-analytics',
    tsx: 'react',
    jsx: 'react',
    component: 'react',
    ui: 'react',
    screen: 'react',
    md: 'markdown',
    doc: 'markdown',
    document: 'markdown',
    note: 'markdown',
    csv: 'table',
    spreadsheet: 'table',
    analytics: 'posthog-analytics',
    dashboard: 'posthog-analytics',
    posthog: 'posthog-analytics',
    'posthog-dashboard': 'posthog-analytics',
    kpi: 'posthog-analytics',
    metrics: 'posthog-analytics',
    funnel: 'posthog-analytics',
    canvas: 'canvas',
    mindmap: 'canvas',
    concept_map: 'canvas',
    idea_map: 'canvas',
    flow_diagram: 'canvas',
    whiteboard: 'canvas',
    sketch: 'canvas',
    model3d: 'model3d',
    '3d': 'model3d',
    '3d_model': 'model3d',
    model: 'model3d',
    scene: 'model3d',
    mesh: 'model3d',
    simulation: 'simulation',
    sim: 'simulation',
    calculator: 'simulation',
    parametric: 'simulation',
    interactive_model: 'simulation',
}

/** Resilient argument parser repairing LLM syntax quirks, quotes, truncated brackets, and fences. */
function parseArgs(raw: string): Record<string, unknown> {
    return repairAndParseJsonObject(raw) || {}
}

function normalizeArgs(name: string, args: Record<string, unknown>): Record<string, unknown> {
    const aliases = ARG_ALIASES[name]
    const output: Record<string, unknown> = { ...args }
    if (aliases) {
        for (const [from, to] of Object.entries(aliases)) {
            if (output[to] == null && output[from] != null) output[to] = output[from]
        }
    }
    // Auto-coerce stringified JSON structures for tools that accept arrays or objects
    for (const key of Object.keys(output)) {
        const val = output[key]
        if (typeof val === 'string') {
            const trimmed = val.trim()
            if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
                try {
                    const parsed = JSON.parse(trimmed)
                    if (parsed && typeof parsed === 'object') {
                        output[key] = parsed
                    }
                } catch {
                    const repaired = repairAndParseJsonObject(trimmed)
                    if (repaired) output[key] = repaired
                }
            }
        }
    }
    if (name === 'read_post' && typeof output.slug === 'string') {
        output.slug = output.slug.replace(/^\/?(posts\/)?/i, '').replace(/\/+$/, '')
    }
    if (name === 'create_artifact' && typeof output.type === 'string') {
        const key = output.type.trim().toLowerCase()
        output.type = ARTIFACT_TYPE_ALIASES[key] || key
    }
    if (name === 'open_path' && typeof output.path === 'string') {
        output.path = output.path.replace(/^app:/i, '').trim()
    }
    return output
}

function languageFor(type: ArtifactKind): string | undefined {
    if (type === 'mermaid') return 'mermaid'
    if (type === 'react') return 'tsx'
    if (type === 'chart' || type === 'json' || type === 'canvas' || type === 'model3d' || type === 'simulation') return 'json'
    if (type === 'html') return 'html'
    if (type === 'svg') return 'svg'
    if (type === 'table' || type === 'markdown') return 'markdown'
    return undefined
}

async function executeCreateArtifact(
    args: Record<string, unknown>,
    host?: HostSnapshot
): Promise<Omit<ToolExecution, 'callId' | 'name'>> {
    const type = String(args.type || host?.artifactType || '').toLowerCase() as ArtifactToolType
    const title = asText(args.title, MAX_TITLE).trim() || asText(host?.artifactTitle, MAX_TITLE).trim() || 'Untitled'
    const content = asText(args.content, MAX_ARTIFACT_BODY).trim()
    if (!ARTIFACT_TOOL_TYPES.includes(type) || content.length < 8) {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'type and content are required' }) }
    }
    const invalid = artifactContentError(type, content)
    if (invalid) {
        return { ok: false, result: JSON.stringify({ ok: false, error: invalid }) }
    }

    const artifact: ArtifactDocument = {
        id: host?.artifactId || `art-tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        identifier: host?.artifactId || `${type}-1`,
        title,
        type: type as ArtifactKind,
        language: languageFor(type as ArtifactKind),
        content,
        description: type === 'react' ? 'Sandbox screen' : type === 'mermaid' ? 'Diagram' : 'Generated artifact',
        version: 1,
        createdAt: new Date().toISOString(),
    }

    if (type === 'chart') {
        const spec = parseChartSpec(content)
        if (!spec) return { ok: false, result: JSON.stringify({ ok: false, error: 'content must be valid chart JSON' }) }
        artifact.chartSpec = spec
        artifact.content = JSON.stringify(spec, null, 2)
        artifact.language = 'json'
    }

    if (type === 'posthog-analytics') {
        const spec = parsePostHogAnalyticsSpec(content)
        if (!spec) return { ok: false, result: JSON.stringify({ ok: false, error: 'content must be valid analytics JSON (metrics, graph, table, or funnel)' }) }
        artifact.chartSpec = spec as any
        artifact.content = JSON.stringify(spec, null, 2)
        artifact.language = 'json'
        artifact.description = 'PostHog Lemon Analytics'
    }

    return {
        ok: true,
        result: JSON.stringify({ ok: true, id: artifact.id, type: artifact.type, title: artifact.title }),
        artifact,
    }
}

async function executeWebSearch(
    args: Record<string, unknown>,
    env?: EnvStore
): Promise<Omit<ToolExecution, 'callId' | 'name'>> {
    const query = asText(args.query, MAX_SEARCH_QUERY).trim()
    if (query.length < 2) {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'query required' }) }
    }
    const hits = await searchWebSources(query, env)
    const citations: AiCitation[] = hits.slice(0, 6).map((item, index) => ({
        id: index + 1,
        title: item.title,
        url: item.url,
        snippet: item.snippet.slice(0, 280),
        source: item.source,
    }))
    const formatted = formatSearchResults(hits.slice(0, 6))
    return {
        ok: true,
        result: clip(
            formatted
                ? `UNTRUSTED web results for "${query}":\n${formatted}`
                : `No web results for "${query}".`,
            MAX_TOOL_RESULT
        ),
        citations,
    }
}

async function executeGenerateImage(
    prompt: string,
    options?: { aspect_ratio?: string; style?: string },
    env?: EnvStore,
    _host?: HostSnapshot
): Promise<Omit<ToolExecution, 'callId' | 'name'>> {
    const workerUrl = (
        process.env.NEXT_PUBLIC_STORAGE_WORKER_URL ||
        env?.NEXT_PUBLIC_STORAGE_WORKER_URL ||
        'https://worldinmaking-storage.dursunkayamustafa.workers.dev'
    ).replace(/\/+$/, '')

    const authToken =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        env?.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        ''

    if (!authToken) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: 'Authentication key is not configured for image generation.',
            }),
        }
    }

    try {
        const payload: Record<string, any> = { prompt }
        if (options?.aspect_ratio) payload.aspect_ratio = options.aspect_ratio
        if (options?.style) payload.style = options.style

        const res = await fetch(`${workerUrl}/image`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: string }
            return {
                ok: false,
                result: JSON.stringify({
                    ok: false,
                    error: err?.error || `Cloudflare image generation failed (${res.status}).`,
                }),
            }
        }

        const data = (await res.json()) as {
            storage_key: string
            url: string
            aspect_ratio?: string
            style?: string
            width?: number
            height?: number
        }
        const fullUrl = `${workerUrl}${data.url.startsWith('/') ? '' : '/'}${data.url}`
        const safeAlt = prompt.slice(0, 48).replace(/[\[\]"]/g, '').trim()

        return {
            ok: true,
            result: JSON.stringify({
                ok: true,
                url: fullUrl,
                storage_key: data.storage_key,
                aspect_ratio: data.aspect_ratio,
                style: data.style,
                dimensions: data.width && data.height ? `${data.width}x${data.height}` : undefined,
                markdown: `![${safeAlt}](${fullUrl})`,
                instruction: `Image generated and stored in R2. Embed it in your public response as: ![${safeAlt}](${fullUrl})`,
            }),
        }
    } catch (err: any) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: err?.message || 'Failed to connect to Cloudflare image generator.',
            }),
        }
    }
}

async function executeAcademicSearch(
    query: string,
    options?: AcademicSearchOptions,
    env?: EnvStore
): Promise<Omit<ToolExecution, 'callId' | 'name'>> {
    try {
        const result = await searchAcademicCorpus(query, options)

        // Web search fallback if external academic APIs and canonical corpus returned 0 papers
        if (result.papers.length === 0 && env) {
            try {
                const limit = options?.limit || 5
                const webHits = await searchWebSources(`${query} academic paper research`, env)
                if (webHits && webHits.length > 0) {
                    const fallbackPapers: AcademicPaper[] = webHits.slice(0, limit).map((h, i) => ({
                        id: `web-${i + 1}-${Date.now()}`,
                        title: h.title,
                        authors: [h.source || 'Web Source'],
                        venue: h.source,
                        citationCount: 0,
                        doi: h.url.startsWith('http') ? h.url : undefined,
                        pdfUrl: h.url.endsWith('.pdf') ? h.url : undefined,
                        abstract: h.snippet,
                        source: 'Web Search',
                    }))
                    result.papers = fallbackPapers
                    result.total = fallbackPapers.length
                    result.formatted = formatAcademicResults(fallbackPapers)
                    result.bibliography = formatApaBibliography(fallbackPapers)
                }
            } catch {
                // Ignore web search fallback error
            }
        }

        const citations: AiCitation[] = result.papers.map((p, idx) => ({
            id: idx + 1,
            url: p.doi || p.pdfUrl || (p.id.startsWith('http') ? p.id : `https://doi.org/${p.id}`),
            title: `${p.title} (${p.authors[0] || 'Unknown'}, ${p.year || 'n.d.'})`,
            snippet: p.abstract ? clip(p.abstract, 200) : clip(p.title, 120),
            source: p.venue || p.source,
        }))

        return {
            ok: true,
            result: clip(
                JSON.stringify({
                    ok: true,
                    total: result.total,
                    query: result.query,
                    papers: result.papers,
                    formatted: result.formatted,
                    bibliography: result.bibliography,
                }),
                MAX_TOOL_RESULT
            ),
            citations: citations.length > 0 ? citations : undefined,
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Academic search failed'
        return {
            ok: false,
            result: JSON.stringify({ ok: false, error: message }),
        }
    }
}

async function executeAnalyzeImage(
    imageUrl: string,
    question?: string,
    env?: EnvStore,
    _host?: HostSnapshot
): Promise<Omit<ToolExecution, 'callId' | 'name'>> {
    const workerUrl = (
        process.env.NEXT_PUBLIC_STORAGE_WORKER_URL ||
        env?.NEXT_PUBLIC_STORAGE_WORKER_URL ||
        'https://worldinmaking-storage.dursunkayamustafa.workers.dev'
    ).replace(/\/+$/, '')

    const authToken =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        env?.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        ''

    if (!authToken) {
        return {
            ok: false,
            result: JSON.stringify({ ok: false, error: 'Authentication key is not configured for image analysis.' }),
        }
    }

    const blocked = isBlockedFetchUrl(imageUrl)
    if (blocked) {
        return { ok: false, result: JSON.stringify({ ok: false, error: blocked }) }
    }
    let parsed: URL
    try {
        parsed = new URL(imageUrl)
    } catch {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'url is invalid' }) }
    }
    const parsedHost = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    const ipv4Literal = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsedHost)
    if (!ipv4Literal && !parsedHost.includes(':')) {
        const resolved = await assertPublicHostname(parsedHost)
        if (resolved) return { ok: false, result: JSON.stringify({ ok: false, error: resolved }) }
    }

    try {
        const res = await fetch(`${workerUrl}/vision`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_url: imageUrl,
                prompt: question || 'Analyze this image in detail. Describe its visual elements, style, text, handwriting, concepts, and key information.',
            }),
        })

        if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: string }
            return {
                ok: false,
                result: JSON.stringify({
                    ok: false,
                    error: err?.error || `Cloudflare vision analysis failed (${res.status}).`,
                }),
            }
        }

        const data = (await res.json()) as { ok: boolean; analysis: string; model?: string }
        return {
            ok: true,
            result: clip(
                JSON.stringify({
                    ok: true,
                    image_url: imageUrl,
                    analysis: data.analysis,
                    model: data.model,
                }),
                MAX_READ_RESULT
            ),
        }
    } catch (err: any) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: err?.message || 'Failed to connect to Cloudflare vision service.',
            }),
        }
    }
}

async function executeTranscribeAudio(
    audioUrl: string,
    language?: string,
    env?: EnvStore,
    _host?: HostSnapshot
): Promise<Omit<ToolExecution, 'callId' | 'name'>> {
    const workerUrl = (
        process.env.NEXT_PUBLIC_STORAGE_WORKER_URL ||
        env?.NEXT_PUBLIC_STORAGE_WORKER_URL ||
        'https://worldinmaking-storage.dursunkayamustafa.workers.dev'
    ).replace(/\/+$/, '')

    const authToken =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        env?.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        ''

    if (!authToken) {
        return {
            ok: false,
            result: JSON.stringify({ ok: false, error: 'Authentication key is not configured for audio transcription.' }),
        }
    }

    const blocked = isBlockedFetchUrl(audioUrl)
    if (blocked) {
        return { ok: false, result: JSON.stringify({ ok: false, error: blocked }) }
    }
    let parsed: URL
    try {
        parsed = new URL(audioUrl)
    } catch {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'url is invalid' }) }
    }
    const parsedHost = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    const ipv4Literal = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsedHost)
    if (!ipv4Literal && !parsedHost.includes(':')) {
        const resolved = await assertPublicHostname(parsedHost)
        if (resolved) return { ok: false, result: JSON.stringify({ ok: false, error: resolved }) }
    }

    try {
        const res = await fetch(`${workerUrl}/transcribe`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                audio_url: audioUrl,
                language,
            }),
        })

        if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: string }
            return {
                ok: false,
                result: JSON.stringify({
                    ok: false,
                    error: err?.error || `Cloudflare audio transcription failed (${res.status}).`,
                }),
            }
        }

        const data = (await res.json()) as { ok: boolean; text: string; vtt?: string }
        return {
            ok: true,
            result: clip(
                JSON.stringify({
                    ok: true,
                    audio_url: audioUrl,
                    transcription: data.text,
                    vtt: data.vtt,
                }),
                MAX_READ_RESULT
            ),
        }
    } catch (err: any) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: err?.message || 'Failed to connect to Cloudflare transcription service.',
            }),
        }
    }
}

async function executeSynthesizeSpeech(
    text: string,
    language?: string,
    env?: EnvStore,
    _host?: HostSnapshot
): Promise<Omit<ToolExecution, 'callId' | 'name'>> {
    const workerUrl = (
        process.env.NEXT_PUBLIC_STORAGE_WORKER_URL ||
        env?.NEXT_PUBLIC_STORAGE_WORKER_URL ||
        'https://worldinmaking-storage.dursunkayamustafa.workers.dev'
    ).replace(/\/+$/, '')

    const authToken =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        env?.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        ''

    if (!authToken) {
        return {
            ok: false,
            result: JSON.stringify({ ok: false, error: 'Authentication key is not configured for speech synthesis.' }),
        }
    }

    try {
        const res = await fetch(`${workerUrl}/speech`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                lang: language || 'tr',
            }),
        })

        if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: string }
            return {
                ok: false,
                result: JSON.stringify({
                    ok: false,
                    error: err?.error || `Cloudflare speech synthesis failed (${res.status}).`,
                }),
            }
        }

        const data = (await res.json()) as { ok: boolean; storage_key: string; url: string; content_type?: string }
        const fullUrl = `${workerUrl}${data.url.startsWith('/') ? '' : '/'}${data.url}`
        const safeSnippet = text.slice(0, 48).replace(/[\[\]"]/g, '').trim()

        return {
            ok: true,
            result: JSON.stringify({
                ok: true,
                url: fullUrl,
                storage_key: data.storage_key,
                content_type: data.content_type,
                player_html: `<audio controls src="${fullUrl}"></audio>`,
                markdown: `[🔊 Dinle: "${safeSnippet}"](${fullUrl})`,
                instruction: `Speech synthesized and stored in R2. Embed it in your public response as: [🔊 Dinle: "${safeSnippet}"](${fullUrl}) or <audio controls src="${fullUrl}"></audio>`,
            }),
        }
    } catch (err: any) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: err?.message || 'Failed to connect to Cloudflare speech synthesizer.',
            }),
        }
    }
}

function executeCrossExamineArgument(
    argumentText: string,
    tradition?: string,
    counterTarget?: string
): Omit<ToolExecution, 'callId' | 'name'> {
    const analysis = crossExamineArgument(argumentText, tradition, counterTarget)
    return {
        ok: true,
        result: clip(JSON.stringify({ ok: true, ...analysis }), MAX_READ_RESULT),
    }
}

function executeVerifiedCorpusSearch(
    query: string,
    philosopher?: string,
    work?: string,
    maxResults: number = 5
): Omit<ToolExecution, 'callId' | 'name'> {
    const searchRes = searchPhilosophicalCorpus(query, {
        thinker: philosopher,
        work,
        limit: maxResults,
    })

    const citations: AiCitation[] = searchRes.matches.map((r, i) => ({
        id: i + 1,
        title: `${r.thinker} — ${r.work}${r.section ? ` (${r.section})` : ''}`,
        url: `corpus://${encodeURIComponent(r.thinker.toLowerCase())}/${encodeURIComponent(r.work.toLowerCase())}`,
        snippet: r.fragment,
    }))

    return {
        ok: true,
        result: clip(
            JSON.stringify({
                ok: true,
                query,
                total_found: searchRes.count,
                citations: searchRes.matches.map((m) => ({
                    philosopher: m.thinker,
                    work: m.work,
                    section: m.section,
                    quote: m.fragment,
                    context: m.context,
                })),
            }),
            MAX_TOOL_RESULT
        ),
        citations: citations.length > 0 ? citations : undefined,
    }
}

function executeArrangeWorkspacePreset(
    presetName: string,
    host?: HostSnapshot
): { ok: boolean; result: string; action: HostOsAction } {
    const p = presetName.toLowerCase().trim()
    let action = 'tile'
    let leftPath: string | undefined
    let rightPath: string | undefined
    let focusPath: string | undefined

    switch (p) {
        case 'deep_reading':
            action = 'split'
            leftPath = '/posts'
            rightPath = '/notebooks'
            break
        case 'studio':
            action = 'split'
            leftPath = '/notebooks'
            rightPath = '/workspace-chat'
            break
        case 'minimal':
            action = 'focus'
            focusPath = '/notebooks'
            break
        case 'split_dual':
            action = 'split'
            leftPath = host?.path || '/notebooks'
            rightPath = '/posts'
            break
        case 'research':
        default:
            action = 'tile'
            leftPath = '/scratchpad'
            rightPath = '/notebooks'
            break
    }

    const executed = executeManageWindows(host, action, focusPath, leftPath, rightPath)
    return {
        ok: true,
        result: JSON.stringify({
            ok: true,
            preset: p,
            layout: action,
            path: focusPath,
            left_path: leftPath,
            right_path: rightPath,
        }),
        action: {
            ...executed.action,
            title: `Workspace preset: ${p.replace(/_/g, ' ')}`,
            description: `Applied ${p} workspace preset (${action})`,
        },
    }
}

function executeGenerateFlashcards(
    rawCards: unknown,
    deckTitle?: string,
    saveToNotebook?: boolean,
    notebookId?: string,
    host?: HostSnapshot
): { ok: boolean; result: string; action?: HostOsAction } {
    let cards: Array<{ front: string; back: string; hint?: string; tags?: string[] }> = []
    if (Array.isArray(rawCards)) {
        cards = rawCards
            .filter((c) => c && typeof c === 'object')
            .map((c: any) => ({
                front: String(c.front || c.question || c.q || '').trim(),
                back: String(c.back || c.answer || c.a || '').trim(),
                hint: c.hint ? String(c.hint).trim() : undefined,
                tags: Array.isArray(c.tags) ? c.tags.map((t: any) => String(t).trim()) : undefined,
            }))
            .filter((c) => c.front.length > 0 && c.back.length > 0)
    }

    if (cards.length === 0) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: 'At least one valid flashcard with "front" and "back" is required.',
            }),
        }
    }

    const title = (deckTitle || 'Study Flashcards').trim()

    const markdownDeck = [
        `# 🗂️ ${title}`,
        '',
        `> **Deck Summary**: ${cards.length} active-recall flashcard(s).`,
        '',
        ...cards.map((card, idx) => {
            const tagsFormatted = card.tags && card.tags.length > 0 ? ` \`[${card.tags.join(', ')}]\`` : ''
            const hintFormatted = card.hint ? `\n> *Hint: ${card.hint}*` : ''
            return `### Card ${idx + 1}${tagsFormatted}\n**Q: ${card.front}**\n\n<details>\n<summary>Reveal Answer</summary>\n\n**A:** ${card.back}\n</details>${hintFormatted}\n`
        }),
    ].join('\n')

    let action: HostOsAction | undefined
    if (saveToNotebook) {
        const targetId = notebookId || host?.notebookId || host?.notebooks?.[0]?.id
        if (targetId) {
            action = {
                type: 'insert_notebook_block',
                title: `Appended flashcard deck "${title}" to notebook`,
                description: `Appended ${cards.length} flashcards to notebook`,
                payload: {
                    notebookId: targetId,
                    content: `\n\n${markdownDeck}\n`,
                },
            }
        } else {
            action = {
                type: 'create_notebook',
                title: `Create flashcard notebook: ${title}`,
                description: `Created flashcard deck notebook with ${cards.length} cards`,
                payload: {
                    title,
                    content: markdownDeck,
                },
            }
        }
    }

    return {
        ok: true,
        result: clip(
            JSON.stringify({
                ok: true,
                deck_title: title,
                total_cards: cards.length,
                flashcards: cards,
                saved_to_notebook: Boolean(saveToNotebook),
                notebook_markdown: markdownDeck,
            }),
            MAX_TOOL_RESULT
        ),
        action,
    }
}

function compileNotebookToMarkdown(title: string, rawContent: string, includeToc = true): string {
    const lines = rawContent.split('\n')
    const headings: Array<{ level: number; text: string; slug: string }> = []

    if (includeToc) {
        for (const line of lines) {
            const match = line.match(/^(#{1,4})\s+(.+)$/)
            if (match) {
                const level = match[1].length
                const text = match[2].trim()
                const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
                headings.push({ level, text, slug })
            }
        }
    }

    let toc = ''
    if (headings.length > 0) {
        toc = '## Table of Contents\n\n' + headings
            .map((h) => `${'  '.repeat(Math.max(0, h.level - 1))}- [${h.text}](#${h.slug})`)
            .join('\n') + '\n\n---\n\n'
    }

    return `# ${title}\n\n${toc}${rawContent}`
}

function compileNotebookToLatex(title: string, rawContent: string, includeToc = true): string {
    const lines = rawContent.split('\n')
    const convertedLines = lines.map((line) => {
        if (/^####\s+(.+)$/.test(line)) {
            const h = line.replace(/^####\s+/, '').replace(/([&%$_{}])/g, '\\$1')
            return `\\paragraph{${h}}`
        }
        if (/^###\s+(.+)$/.test(line)) {
            const h = line.replace(/^###\s+/, '').replace(/([&%$_{}])/g, '\\$1')
            return `\\subsubsection{${h}}`
        }
        if (/^##\s+(.+)$/.test(line)) {
            const h = line.replace(/^##\s+/, '').replace(/([&%$_{}])/g, '\\$1')
            return `\\subsection{${h}}`
        }
        if (/^#\s+(.+)$/.test(line)) {
            const h = line.replace(/^#\s+/, '').replace(/([&%$_{}])/g, '\\$1')
            return `\\section{${h}}`
        }
        return line
            .replace(/\\/g, '\\textbackslash ')
            .replace(/([&%$#_{}])/g, '\\$1')
            .replace(/~/g, '\\textasciitilde ')
            .replace(/\^/g, '\\textasciicircum ')
    })

    const body = convertedLines.join('\n')
    const safeTitle = title.replace(/([&%$#_{}])/g, '\\$1')
    return [
        '\\documentclass[11pt,a4paper]{article}',
        '\\usepackage[utf8]{inputenc}',
        '\\usepackage{hyperref}',
        '\\usepackage{geometry}',
        '\\geometry{margin=1in}',
        `\\title{${safeTitle}}`,
        '\\author{WorldInMaking Notebook}',
        '\\date{\\today}',
        '\\begin{document}',
        '\\maketitle',
        includeToc ? '\\tableofcontents\n\\newpage' : '',
        '',
        body,
        '',
        '\\end{document}',
    ].filter(Boolean).join('\n')
}

function compileNotebookToHtml(title: string, rawContent: string, _includeToc = true): string {
    const escaped = rawContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

    const formatted = escaped
        .replace(/^### (.*$)/gim, '<h3 id="$1">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 id="$1">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 id="$1">$1</h1>')
        .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/`([^`]+)`/gim, '<code>$1</code>')
        .replace(/\n\n+/g, '</p><p>')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1e293b; background: #fafaf9; }
    h1, h2, h3 { color: #0f172a; margin-top: 1.5em; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
    blockquote { border-left: 4px solid #3b82f6; margin: 1em 0; padding: 0.5em 1em; background: #f0f9ff; color: #1e3a8a; }
    code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    p { margin: 1em 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${formatted}</p>
</body>
</html>`
}

function compileNotebookToText(title: string, rawContent: string): string {
    const border = '='.repeat(Math.max(40, title.length + 4))
    return `${border}\n  ${title.toUpperCase()}\n${border}\n\n${rawContent}`
}

function executeExportNotebook(
    format: string,
    notebookId?: string,
    includeToc: boolean = true,
    _includeFootnotes: boolean = true,
    host?: HostSnapshot
): { ok: boolean; result: string; artifact?: ArtifactDocument } {
    const requested = (notebookId || '').trim()
    const targetId = requested || host?.notebookId || host?.notebooks?.[0]?.id || ''
    const match = host?.notebooks?.find((n) => n.id === targetId || n.title.toLowerCase() === requested.toLowerCase())

    const title = match?.title || host?.notebookTitle || 'Exported Notebook'
    const content = match?.content || host?.selection || '(Empty Notebook)'
    const fmt = format.toLowerCase().trim() || 'markdown'

    let compiled = ''
    let lang = 'markdown'
    let artType: ArtifactKind = 'markdown'

    switch (fmt) {
        case 'latex':
        case 'tex':
            compiled = compileNotebookToLatex(title, content, includeToc)
            lang = 'latex'
            artType = 'markdown'
            break
        case 'html':
            compiled = compileNotebookToHtml(title, content, includeToc)
            lang = 'html'
            artType = 'html'
            break
        case 'text':
        case 'txt':
            compiled = compileNotebookToText(title, content)
            lang = 'text'
            artType = 'markdown'
            break
        case 'markdown':
        case 'md':
        default:
            compiled = compileNotebookToMarkdown(title, content, includeToc)
            lang = 'markdown'
            artType = 'markdown'
            break
    }

    const artifact: ArtifactDocument = {
        id: `export-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        identifier: `export-${fmt}`,
        title: `${title} (${fmt.toUpperCase()})`,
        type: artType,
        language: lang,
        content: compiled,
        description: `Exported publication document: ${title}`,
        version: 1,
        createdAt: new Date().toISOString(),
    }

    return {
        ok: true,
        result: clip(
            JSON.stringify({
                ok: true,
                format: fmt,
                title,
                notebook_id: targetId || undefined,
                content_length: compiled.length,
                document: compiled,
            }),
            MAX_READ_RESULT
        ),
        artifact,
    }
}

function executeCreateConceptMap(
    title: string,
    nodesRaw: unknown,
    edgesRaw: unknown,
    description?: string
): { ok: boolean; result: string; artifact?: ArtifactDocument } {
    const mapTitle = (title || 'Concept Map').trim()
    let nodesList: any[] = []
    if (Array.isArray(nodesRaw)) {
        nodesList = nodesRaw.filter((n) => n && typeof n === 'object')
    }
    let edgesList: any[] = []
    if (Array.isArray(edgesRaw)) {
        edgesList = edgesRaw.filter((e) => e && typeof e === 'object')
    }

    if (nodesList.length === 0) {
        return {
            ok: false,
            result: JSON.stringify({
                ok: false,
                error: 'At least one node is required for create_concept_map.',
            }),
        }
    }

    const COLS = Math.ceil(Math.sqrt(nodesList.length)) || 3
    const GAP_X = 260
    const GAP_Y = 160
    const START_X = 100
    const START_Y = 100

    const formattedNodes = nodesList.map((n, idx) => {
        const row = Math.floor(idx / COLS)
        const col = idx % COLS
        const id = String(n.id || `node-${idx + 1}`).trim()
        const label = String(n.label || n.title || n.name || id).trim()
        const x = typeof n.x === 'number' ? n.x : START_X + col * GAP_X
        const y = typeof n.y === 'number' ? n.y : START_Y + row * GAP_Y
        const color = typeof n.color === 'string' ? n.color : undefined
        const icon = typeof n.icon === 'string' ? n.icon : undefined
        const nodeType = typeof n.type === 'string' ? n.type : 'concept'
        const tags = Array.isArray(n.tags) ? n.tags.map((t: any) => String(t).trim()) : undefined
        const desc = typeof n.description === 'string' ? n.description.trim() : undefined

        return {
            id,
            label,
            description: desc,
            x,
            y,
            color,
            icon,
            type: nodeType,
            tags,
        }
    })

    const formattedEdges = edgesList
        .map((e) => {
            const from = String(e.from || e.source || '').trim()
            const to = String(e.to || e.target || '').trim()
            const label = e.label ? String(e.label).trim() : undefined
            const style = ['solid', 'dashed', 'dotted'].includes(e.style) ? e.style : 'solid'
            const color = typeof e.color === 'string' ? e.color : undefined

            return {
                from,
                to,
                label,
                style,
                color,
            }
        })
        .filter((e) => e.from && e.to)

    const canvasSpec: CanvasSpec = {
        title: mapTitle,
        description: description || `Visual concept map for ${mapTitle}`,
        nodes: formattedNodes,
        edges: formattedEdges,
    }

    const artifactContent = JSON.stringify(canvasSpec, null, 2)
    const artifact: ArtifactDocument = {
        id: `art-canvas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        identifier: `canvas-${Date.now()}`,
        title: mapTitle,
        type: 'canvas',
        language: 'json',
        content: artifactContent,
        description: description || `Visual concept map: ${mapTitle}`,
        version: 1,
        createdAt: new Date().toISOString(),
    }

    return {
        ok: true,
        result: clip(
            JSON.stringify({
                ok: true,
                id: artifact.id,
                title: mapTitle,
                nodes_count: formattedNodes.length,
                edges_count: formattedEdges.length,
            }),
            MAX_TOOL_RESULT
        ),
        artifact,
    }
}

const TOOL_NAME_ALIASES: Record<string, string> = {
    google_search: 'web_search',
    search: 'web_search',
    bing_search: 'web_search',
    browse: 'fetch_url',
    fetch: 'fetch_url',
    open: 'open_path',
    open_window: 'open_path',
    navigate: 'open_path',
    workspace: 'get_workspace',
    list_notes: 'list_notebooks',
    add_notebook_block: 'insert_notebook_block',
    append_notebook: 'insert_notebook_block',
    write_notebook: 'insert_notebook_block',
    rewrite_notebook: 'rewrite_notebook_document',
    rewrite_document: 'rewrite_notebook_document',
    replace_selection: 'replace_notebook_selection',
    rename_notebook: 'update_notebook_title',
    set_notebook_title: 'update_notebook_title',
    artifact: 'create_artifact',
    read_pdf: 'read_document',
    read_file: 'read_document',
    parse_document: 'read_document',
    view_document: 'read_document',
    inspect_document: 'read_document',
    scratchpad: 'write_scratchpad',
    take_notes: 'write_scratchpad',
    note_down: 'write_scratchpad',
    add_note: 'write_scratchpad',
    plan_task: 'todo_write',
    update_todo: 'todo_write',
    todo: 'todo_write',
    tasks: 'todo_write',
    enter_plan: 'switch_mode',
    enter_execute: 'switch_mode',
    set_mode: 'switch_mode',
    save_memory: 'remember',
    memorize: 'remember',
    ready_plan: 'finalize_plan',
    ask: 'ask_user',
    clarify: 'ask_user',
    question_user: 'ask_user',
    submit_plan: 'finalize_plan',
    subagent: 'task',
    sub_task: 'task',
    create_image: 'generate_image',
    draw_image: 'generate_image',
    paint_image: 'generate_image',
    generate_picture: 'generate_image',
    text_to_image: 'generate_image',
    academic_search: 'search_academic_corpus',
    search_papers: 'search_academic_corpus',
    find_papers: 'search_academic_corpus',
    search_philosophy_papers: 'search_academic_corpus',
    scholarly_search: 'search_academic_corpus',
    inspect_visual: 'analyze_image',
    analyze_visual: 'analyze_image',
    vision: 'analyze_image',
    ocr_image: 'analyze_image',
    ocr: 'analyze_image',
    transcribe: 'transcribe_audio',
    transcribe_speech: 'transcribe_audio',
    audio_to_text: 'transcribe_audio',
    speech_to_text: 'transcribe_audio',
    voice_to_text: 'transcribe_audio',
    speak: 'synthesize_speech',
    speak_text: 'synthesize_speech',
    text_to_speech: 'synthesize_speech',
    tts: 'synthesize_speech',
    narrate: 'synthesize_speech',
    add_footnote: 'add_notebook_footnote',
    insert_footnote: 'add_notebook_footnote',
    insert_notebook_footnote: 'add_notebook_footnote',
    notebook_footnote: 'add_notebook_footnote',
    footnote: 'add_notebook_footnote',
    add_dipnot: 'add_notebook_footnote',
    dipnot: 'add_notebook_footnote',
    cross_examine: 'cross_examine_argument',
    socratic_cross_examine: 'cross_examine_argument',
    socratic_examine: 'cross_examine_argument',
    examine_argument: 'cross_examine_argument',
    dialectical_examination: 'cross_examine_argument',
    corpus_search: 'verified_corpus_search',
    philosophical_corpus: 'verified_corpus_search',
    search_philosophy_corpus: 'verified_corpus_search',
    philosophy_search: 'verified_corpus_search',
    search_canonical_texts: 'verified_corpus_search',
    canonical_search: 'verified_corpus_search',
    workspace_preset: 'arrange_workspace_preset',
    arrange_workspace: 'arrange_workspace_preset',
    set_workspace_preset: 'arrange_workspace_preset',
    apply_workspace_preset: 'arrange_workspace_preset',
    create_flashcards: 'generate_flashcards',
    flashcards: 'generate_flashcards',
    study_flashcards: 'generate_flashcards',
    make_flashcards: 'generate_flashcards',
    compile_notebook: 'export_notebook',
    export_notes: 'export_notebook',
    download_notebook: 'export_notebook',
    concept_map: 'create_concept_map',
    generate_concept_map: 'create_concept_map',
    mindmap: 'create_concept_map',
    create_mindmap: 'create_concept_map',
}

export function resolveToolName(raw: string): string {
    const key = String(raw || '').trim()
    return TOOL_NAME_ALIASES[key] || TOOL_NAME_ALIASES[key.toLowerCase()] || key
}

export async function executeToolCall(
    call: ToolCall,
    env?: EnvStore,
    host?: HostSnapshot,
    mode: AgentMode = 'ask'
): Promise<ToolExecution> {
    const name = resolveToolName(call.name)
    const base = { callId: call.id, name }
    if (!ALLOWED_TOOL_NAMES.has(name)) {
        return { ...base, ok: false, result: JSON.stringify({ ok: false, error: `unknown tool: ${call.name}` }) }
    }
    if (!isToolAllowedInMode(name, mode)) {
        const result = JSON.stringify({
            ok: false,
            error: `Tool "${name}" is locked in plan mode. Call finalize_plan when the plan is ready, then continue.`,
        })
        return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
    }
    const args = normalizeArgs(name, parseArgs(call.argumentsJson))
    try {
        if (name === 'switch_mode') {
            const next = parseAgentMode(args.mode)
            if (next === 'ask') {
                const result = JSON.stringify({ ok: false, error: 'switch_mode requires mode="plan" or mode="execute"' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const result = JSON.stringify({ ok: true, mode: next })
            return { ...base, ok: true, result, summary: next === 'plan' ? 'Entered plan mode' : 'Entered execution mode' }
        }
        if (name === 'create_artifact') {
            const executed = await executeCreateArtifact(args, host)
            return { ...base, ...executed, summary: executed.artifact?.title || toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'web_search') {
            const executed = await executeWebSearch(args, env)
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'fetch_url') {
            const url = asText(args.url, 2_000).trim()
            const fetched = await fetchPublicUrl(url)
            if (!fetched.ok) {
                const result = JSON.stringify({ ok: false, error: fetched.error })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const result = clip(`UNTRUSTED page text for ${url}:\n${fetched.text}`, MAX_READ_RESULT)
            return { ...base, ok: true, result, summary: toolResultSummary(name, true, result) }
        }
        if (name === 'read_document') {
            const executed = await executeReadDocument(
                {
                    url: asText(args.url, 2_000).trim(),
                    name: asText(args.name, 120).trim(),
                    page: typeof args.page === 'number' ? args.page : undefined,
                    query: asText(args.query, 120).trim(),
                },
                host
            )
            if (!executed.ok) {
                const result = JSON.stringify({ ok: false, error: executed.error })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const result = clip(executed.text, MAX_READ_RESULT)
            return { ...base, ok: true, result, summary: toolResultSummary(name, true, result) }
        }
        if (name === 'write_scratchpad') {
            const content = asText(args.content, 4_000).trim()
            if (!content) {
                const result = JSON.stringify({ ok: false, error: 'scratchpad note content is required' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const source = asText(args.source, 200).trim()
            const result = JSON.stringify({ ok: true, saved: true, note: content, source: source || undefined })
            return {
                ...base,
                ok: true,
                result,
                summary: source ? `Saved note from ${source}` : `Saved note to working memory`,
            }
        }
        if (name === 'todo_write') {
            const rawTasks = Array.isArray(args.tasks) ? args.tasks : []
            const tasks = rawTasks
                .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
                .map((t, idx) => ({
                    id: asText(t.id || `task_${idx + 1}`, 40).trim(),
                    title: asText(t.title || t.name || t.text, 120).trim(),
                    status: (['pending', 'in_progress', 'completed'].includes(String(t.status))
                        ? String(t.status)
                        : 'pending') as 'pending' | 'in_progress' | 'completed',
                }))
                .filter((t) => t.title.length > 0)
            if (tasks.length === 0) {
                const result = JSON.stringify({ ok: false, error: 'tasks array cannot be empty' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const inProgress = tasks.find((t) => t.status === 'in_progress')
            const completedCount = tasks.filter((t) => t.status === 'completed').length
            const result = JSON.stringify({ ok: true, tasks, progress: `${completedCount}/${tasks.length}` })
            return {
                ...base,
                ok: true,
                result,
                summary: inProgress
                    ? `Working on: ${inProgress.title} (${completedCount}/${tasks.length})`
                    : `Updated task plan (${completedCount}/${tasks.length})`,
            }
        }
        if (name === 'get_workspace') {
            const executed = await executeGetWorkspace(host)
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'search_site') {
            const executed = await executeSearchSite(asText(args.query, MAX_SEARCH_QUERY))
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'open_path') {
            const executed = await executeOpenPath(asText(args.path, 120))
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'read_post') {
            const executed = await executeReadPost(asText(args.slug, 180))
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'list_notebooks') {
            const executed = executeListNotebooks(host)
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'read_notebook') {
            const executed = executeReadNotebook(host, asText(args.notebook_id || args.notebookId || args.title || args.query, 120))
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'create_notebook') {
            const executed = executeCreateNotebook(asText(args.title, 80), asText(args.content, 8_000))
            return { ...base, ...executed, summary: executed.action.title }
        }
        if (name === 'insert_notebook_block') {
            const executed = executeInsertNotebookBlock(
                host,
                asText(args.content, 8_000),
                asText(args.notebook_id || args.notebookId, 80)
            )
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'rewrite_notebook_document') {
            const executed = executeRewriteNotebookDocument(
                host,
                asText(args.content, 20_000),
                asText(args.notebook_id || args.notebookId, 80)
            )
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'replace_notebook_selection') {
            const executed = executeReplaceNotebookSelection(
                host,
                asText(args.content, 8_000),
                asText(args.notebook_id || args.notebookId, 80)
            )
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'update_notebook_title') {
            const executed = executeUpdateNotebookTitle(
                host,
                asText(args.title, 120),
                asText(args.notebook_id || args.notebookId, 80)
            )
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'manage_windows') {
            const executed = executeManageWindows(
                host,
                asText(args.action, 40),
                asText(args.path, 120),
                asText(args.left_path || args.leftPath, 120),
                asText(args.right_path || args.rightPath, 120)
            )
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'set_system_appearance') {
            const executed = executeSetSystemAppearance(
                asText(args.theme, 20),
                asText(args.wallpaper, 60),
                typeof args.reduce_transparency === 'boolean' ? args.reduce_transparency : undefined
            )
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'annotate_notebook') {
            const executed = executeAnnotateNotebook(
                host,
                asText(args.span_text || args.spanText || args.quote || args.selection, 500),
                asText(args.note || args.comment || args.critique, 2_000),
                asText(args.notebook_id || args.notebookId, 80)
            )
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'add_notebook_footnote') {
            const executed = executeAddNotebookFootnote(
                host,
                asText(args.text || args.content || args.note || args.comment || args.citation, 2_000),
                asText(args.span_text || args.spanText || args.quote || args.selection, 500) || undefined,
                asText(args.marker || args.id || args.fnId, 40) || undefined,
                asText(args.notebook_id || args.notebookId, 80) || undefined
            )
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'publish_to_forum') {
            const executed = executePublishToForum(
                asText(args.title, 140),
                asText(args.content || args.body, 12_000),
                asText(args.category || args.tag, 40)
            )
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'remember') {
            const fact = asText(args.fact, 400).trim()
            if (!fact) {
                const result = JSON.stringify({ ok: false, error: 'remember requires a fact' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const category = asText(args.category, 40).trim() || 'preference'
            applyRememberedFact(host, fact, category)
            const result = JSON.stringify({ ok: true, remembered: true, fact, category })
            return { ...base, ok: true, result, summary: `Remembered: ${fact}` }
        }
        if (name === 'ask_user') {
            const question = asText(args.question, 1000).trim()
            if (!question) {
                const result = JSON.stringify({ ok: false, error: 'ask_user requires a question' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const result = JSON.stringify({ ok: true, question })
            return { ...base, ok: true, result, summary: `Asked user: ${question}` }
        }
        if (name === 'finalize_plan') {
            const summary = asText(args.summary, 400).trim()
            const result = JSON.stringify({ ok: true, mode: 'execute', summary: summary || undefined })
            return { ...base, ok: true, result, summary: summary || 'Started the plan' }
        }
        if (name === 'task') {
            const goal = asText(args.goal, 2_000).trim()
            if (!goal) {
                const result = JSON.stringify({ ok: false, error: 'task requires a goal' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const result = JSON.stringify({ ok: true, goal })
            return { ...base, ok: true, result, summary: `Running subtask` }
        }
        if (name === 'generate_image') {
            const prompt = asText(args.prompt, 1_000).trim()
            if (!prompt) {
                const result = JSON.stringify({ ok: false, error: 'prompt is required for generate_image' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const aspect_ratio = asText(args.aspect_ratio, 10).trim() || undefined
            const style = asText(args.style, 30).trim() || undefined
            const executed = await executeGenerateImage(prompt, { aspect_ratio, style }, env, host)
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'search_academic_corpus') {
            const query = asText(args.query, MAX_SEARCH_QUERY).trim()
            if (!query) {
                const result = JSON.stringify({ ok: false, error: 'query is required for search_academic_corpus' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const field = asText(args.field, 60).trim() || undefined
            const limit = typeof args.limit === 'number' ? Math.min(Math.max(1, args.limit), 10) : 5
            const yearFrom = typeof args.year_from === 'number' ? args.year_from : undefined
            const yearTo = typeof args.year_to === 'number' ? args.year_to : undefined
            const sortBy =
                typeof args.sort_by === 'string' && ['citations', 'recent', 'relevance'].includes(args.sort_by)
                    ? (args.sort_by as 'citations' | 'recent' | 'relevance')
                    : undefined
            const openAccessOnly = typeof args.open_access_only === 'boolean' ? args.open_access_only : undefined
            const executed = await executeAcademicSearch(
                query,
                {
                    field,
                    limit,
                    yearFrom,
                    yearTo,
                    sortBy,
                    openAccessOnly,
                },
                env
            )
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'analyze_image') {
            const imageUrl = asText(args.image_url || args.imageUrl || args.url, 2_000).trim()
            if (!imageUrl) {
                const result = JSON.stringify({ ok: false, error: 'image_url is required for analyze_image' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const question = asText(args.question || args.prompt, 1_000).trim() || undefined
            const executed = await executeAnalyzeImage(imageUrl, question, env, host)
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'transcribe_audio') {
            const audioUrl = asText(args.audio_url || args.audioUrl || args.url, 2_000).trim()
            if (!audioUrl) {
                const result = JSON.stringify({ ok: false, error: 'audio_url is required for transcribe_audio' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const language = asText(args.language || args.lang, 10).trim() || undefined
            const executed = await executeTranscribeAudio(audioUrl, language, env, host)
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'synthesize_speech') {
            const text = asText(args.text || args.content || args.prompt, 2_000).trim()
            if (!text) {
                const result = JSON.stringify({ ok: false, error: 'text is required for synthesize_speech' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const language = asText(args.language || args.lang, 10).trim() || undefined
            const executed = await executeSynthesizeSpeech(text, language, env, host)
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'cross_examine_argument') {
            const argumentText = asText(args.argument || args.claim || args.thesis || args.text, 2_000).trim()
            if (!argumentText) {
                const result = JSON.stringify({ ok: false, error: 'argument is required for cross_examine_argument' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const tradition = asText(args.philosophical_tradition || args.tradition || args.school, 60).trim() || undefined
            const counterTarget = asText(args.counter_target || args.target, 200).trim() || undefined
            const executed = executeCrossExamineArgument(argumentText, tradition, counterTarget)
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'verified_corpus_search') {
            const query = asText(args.query || args.search || args.q, MAX_SEARCH_QUERY).trim()
            if (!query) {
                const result = JSON.stringify({ ok: false, error: 'query is required for verified_corpus_search' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const philosopher = asText(args.philosopher || args.author, 60).trim() || undefined
            const work = asText(args.work || args.book, 100).trim() || undefined
            const maxResults = typeof args.max_results === 'number' ? Math.min(Math.max(1, args.max_results), 10) : 5
            const executed = executeVerifiedCorpusSearch(query, philosopher, work, maxResults)
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'arrange_workspace_preset') {
            const presetName = asText(args.preset_name || args.preset || args.name, 40).trim()
            if (!presetName) {
                const result = JSON.stringify({ ok: false, error: 'preset_name is required for arrange_workspace_preset' })
                return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
            }
            const executed = executeArrangeWorkspacePreset(presetName, host)
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'generate_flashcards') {
            const rawCards = args.flashcards || args.cards || args.deck
            const deckTitle = asText(args.deck_title || args.title || args.topic, 100).trim() || undefined
            const saveToNotebook = typeof args.save_to_notebook === 'boolean' ? args.save_to_notebook : undefined
            const notebookId = asText(args.notebook_id || args.notebookId, 80).trim() || undefined
            const executed = executeGenerateFlashcards(rawCards, deckTitle, saveToNotebook, notebookId, host)
            return {
                ...base,
                ...executed,
                summary: executed.action?.title || toolResultSummary(name, executed.ok, executed.result),
            }
        }
        if (name === 'export_notebook') {
            const format = asText(args.format || args.type || args.as, 20).trim() || 'markdown'
            const notebookId = asText(args.notebook_id || args.notebookId, 80).trim() || undefined
            const includeToc = typeof args.include_toc === 'boolean' ? args.include_toc : true
            const includeFootnotes = typeof args.include_footnotes === 'boolean' ? args.include_footnotes : true
            const executed = executeExportNotebook(format, notebookId, includeToc, includeFootnotes, host)
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        if (name === 'create_concept_map') {
            const title = asText(args.title || args.name, 100).trim() || 'Concept Map'
            const nodes = args.nodes || args.elements || args.concepts
            const edges = args.edges || args.connections || args.relations
            const description = asText(args.description, 300).trim() || undefined
            const executed = executeCreateConceptMap(title, nodes, edges, description)
            return { ...base, ...executed, summary: toolResultSummary(name, executed.ok, executed.result) }
        }
        return { ...base, ok: false, result: JSON.stringify({ ok: false, error: `unhandled tool: ${name}` }) }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'tool failed'
        const result = JSON.stringify({ ok: false, error: message.slice(0, 240) })
        return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
    }
}
