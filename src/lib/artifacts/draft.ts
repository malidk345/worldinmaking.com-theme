import { resolveArtifactToolType } from '../bots/tools/spec'
import type { ArtifactKind } from './kinds'

export type ArtifactDraft = {
    id: string
    identifier: string
    title: string
    type: ArtifactKind
    language?: string
    content: string
    description: string
    version: number
    createdAt: string
    pending: true
    toolCallId: string
}

const ARTIFACT_TOOLS = new Set(['create_artifact', 'create_concept_map'])

export function isArtifactBuildTool(name?: string): boolean {
    return ARTIFACT_TOOLS.has(String(name || ''))
}

function peekQuotedArg(raw: string, keys: string[]): string {
    for (const key of keys) {
        const match = String(raw || '').match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`))
        if (match?.[1]?.trim()) return match[1].trim()
    }
    return ''
}

function parseToolArgs(raw?: string): Record<string, unknown> {
    const text = String(raw || '').trim()
    if (!text) return {}
    try {
        const parsed = JSON.parse(text)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch {
        /* partial JSON while arguments stream in */
    }
    const type = peekQuotedArg(text, ['type', 'kind'])
    const title = peekQuotedArg(text, ['title', 'name'])
    const out: Record<string, unknown> = {}
    if (type) out.type = type
    if (title) out.title = title
    return out
}

export function draftArtifactFromToolEvent(tool: {
    id?: string
    name?: string
    arguments?: string
}): ArtifactDraft | null {
    if (!isArtifactBuildTool(tool.name)) return null
    const args = parseToolArgs(tool.arguments)
    const type =
        tool.name === 'create_concept_map'
            ? 'canvas'
            : resolveArtifactToolType(String(args.type || args.kind || ''))
    if (!type) return null
    const rawTitle = String(args.title || args.name || '').trim().slice(0, 80)
    const title = rawTitle || 'Untitled'
    const toolCallId = String(tool.id || '').trim()
    const id = `art-pending-${(toolCallId || String(Date.now())).slice(0, 40)}`
    return {
        id,
        identifier: id,
        title,
        type,
        language: type === 'react' ? 'tsx' : type === 'html' ? 'html' : 'json',
        content: '',
        description: 'Building',
        version: 1,
        createdAt: new Date().toISOString(),
        pending: true,
        toolCallId,
    }
}

export function artifactWindowKey(art: { id?: string; title?: string; toolCallId?: string }): string {
    if (art.toolCallId) return `artifact-tool-${art.toolCallId}`
    return `artifact-${art.id || encodeURIComponent(art.title || 'untitled')}`
}

export function artifactWindowPath(art: { id?: string; title?: string; toolCallId?: string }): string {
    if (art.toolCallId) return `/artifact/tool-${art.toolCallId}`
    return `/artifact/${art.id || encodeURIComponent(art.title || 'untitled')}`
}
