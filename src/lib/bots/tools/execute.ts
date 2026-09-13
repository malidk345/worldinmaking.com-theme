import { parseChartSpec, parsePostHogAnalyticsSpec } from '../../ai/chart-artifacts'
import type { AiCitation } from '../../ai/contracts'
import type { ArtifactDocument, ArtifactKind } from '../../artifacts/kinds'
import { artifactContentError } from '../../artifacts/validate-source'
import type { EnvStore } from '../runtime-env'
import { formatSearchResults, searchWebSources } from '../web-search'
import { fetchPublicUrl } from './fetch-url'
import { searchAcademicCorpus, type AcademicSearchOptions } from '../academic-search'
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

const MAX_TITLE = 80
const MAX_ARTIFACT_BODY = 24_000
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
    finalize_plan: { text: 'summary', plan: 'summary', description: 'summary' },
    task: { prompt: 'goal', task: 'goal', instruction: 'goal', query: 'goal' },
    generate_image: { p: 'prompt', description: 'prompt', query: 'prompt', text: 'prompt', image_prompt: 'prompt' },
    search_academic_corpus: { q: 'query', search: 'query', text: 'query', topic: 'query', subject: 'field', discipline: 'field' },
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
}

function parseObjectJson(raw: string): Record<string, unknown> | null {
    try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
        if (parsed == null) return {}
        return null
    } catch {
        return null
    }
}

/** Empty or truncated model JSON should not fail zero-arg tools. */
function parseArgs(raw: string): Record<string, unknown> {
    const text = String(raw || '').trim()
    if (!text || text === 'null' || text === 'undefined') return {}
    const direct = parseObjectJson(text)
    if (direct) return direct
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
        const sliced = parseObjectJson(text.slice(start, end + 1))
        if (sliced) return sliced
    }
    return {}
}

function normalizeArgs(name: string, args: Record<string, unknown>): Record<string, unknown> {
    const aliases = ARG_ALIASES[name]
    const output: Record<string, unknown> = { ...args }
    if (aliases) {
        for (const [from, to] of Object.entries(aliases)) {
            if (output[to] == null && output[from] != null) output[to] = output[from]
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
    if (type === 'chart' || type === 'json') return 'json'
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
    options?: AcademicSearchOptions
): Promise<Omit<ToolExecution, 'callId' | 'name'>> {
    try {
        const result = await searchAcademicCorpus(query, options)
        const citations: AiCitation[] = result.papers.map((p, idx) => ({
            id: idx + 1,
            url: p.doi || p.pdfUrl || `https://openalex.org/${p.id}`,
            title: `${p.title} (${p.authors[0] || 'Unknown'}, ${p.year || 'n.d.'})`,
            snippet: p.abstract ? clip(p.abstract, 200) : clip(p.title, 120),
            source: p.venue || p.source,
        }))

        return {
            ok: result.ok,
            result: clip(
                JSON.stringify({
                    ok: result.ok,
                    total: result.total,
                    query: result.query,
                    papers: result.papers,
                    formatted: result.formatted,
                    bibliography: result.bibliography,
                }),
                MAX_TOOL_RESULT
            ),
            citations,
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
            const executed = await executeAcademicSearch(query, {
                field,
                limit,
                yearFrom,
                yearTo,
                sortBy,
                openAccessOnly,
            })
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
        return { ...base, ok: false, result: JSON.stringify({ ok: false, error: `unhandled tool: ${name}` }) }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'tool failed'
        const result = JSON.stringify({ ok: false, error: message.slice(0, 240) })
        return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
    }
}
