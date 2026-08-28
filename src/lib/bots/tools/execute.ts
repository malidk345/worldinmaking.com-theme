import { parseChartSpec } from '../../ai/chart-artifacts'
import type { AiCitation } from '../../ai/contracts'
import type { ArtifactDocument, ArtifactKind } from '../../artifacts/kinds'
import { artifactContentError } from '../../artifacts/validate-source'
import type { EnvStore } from '../runtime-env'
import { formatSearchResults, searchWebSources } from '../web-search'
import { fetchPublicUrl } from './fetch-url'
import {
    executeCreateNotebook,
    executeGetWorkspace,
    executeInsertNotebookBlock,
    executeListNotebooks,
    executeOpenPath,
    executeReadPost,
    executeSearchSite,
    type HostOsAction,
    type HostSnapshot,
} from './host'
import { toolResultSummary } from './labels'
import { ALLOWED_TOOL_NAMES, ARTIFACT_TOOL_TYPES, type ArtifactToolType } from './spec'

const MAX_TITLE = 80
const MAX_ARTIFACT_BODY = 24_000
const MAX_SEARCH_QUERY = 300
const MAX_TOOL_RESULT = 4_000

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
    create_artifact: { kind: 'type', source: 'content', body: 'content', code: 'content', markdown: 'content' },
}

const ARTIFACT_TYPE_ALIASES: Record<string, ArtifactToolType> = {
    diagram: 'mermaid',
    flowchart: 'mermaid',
    flow: 'mermaid',
    graph: 'mermaid',
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

async function executeCreateArtifact(args: Record<string, unknown>): Promise<Omit<ToolExecution, 'callId' | 'name'>> {
    const type = String(args.type || '').toLowerCase() as ArtifactToolType
    const title = asText(args.title, MAX_TITLE).trim() || 'Untitled'
    const content = asText(args.content, MAX_ARTIFACT_BODY).trim()
    if (!ARTIFACT_TOOL_TYPES.includes(type) || content.length < 8) {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'type and content are required' }) }
    }
    const invalid = artifactContentError(type, content)
    if (invalid) {
        return { ok: false, result: JSON.stringify({ ok: false, error: invalid }) }
    }

    const artifact: ArtifactDocument = {
        id: `art-tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        identifier: `${type}-1`,
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
        artifact.content = JSON.stringify(spec)
        artifact.language = 'json'
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
    artifact: 'create_artifact',
}

export function resolveToolName(raw: string): string {
    const key = String(raw || '').trim()
    return TOOL_NAME_ALIASES[key] || TOOL_NAME_ALIASES[key.toLowerCase()] || key
}

export async function executeToolCall(call: ToolCall, env?: EnvStore, host?: HostSnapshot): Promise<ToolExecution> {
    const name = resolveToolName(call.name)
    const base = { callId: call.id, name }
    if (!ALLOWED_TOOL_NAMES.has(name)) {
        return { ...base, ok: false, result: JSON.stringify({ ok: false, error: `unknown tool: ${call.name}` }) }
    }
    const args = normalizeArgs(name, parseArgs(call.argumentsJson))
    try {
        if (name === 'create_artifact') {
            const executed = await executeCreateArtifact(args)
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
            const result = clip(`UNTRUSTED page text for ${url}:\n${fetched.text}`, MAX_TOOL_RESULT)
            return { ...base, ok: true, result, summary: toolResultSummary(name, true, result) }
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
        return { ...base, ok: false, result: JSON.stringify({ ok: false, error: `unhandled tool: ${name}` }) }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'tool failed'
        const result = JSON.stringify({ ok: false, error: message.slice(0, 240) })
        return { ...base, ok: false, result, summary: toolResultSummary(name, false, result) }
    }
}
