import type { ArtifactKind } from './kinds'

const MERMAID_HINT =
    /(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram|mindmap|timeline|gitGraph|\bpie\b|journey|quadrantChart|participant\s|-->|---|===)/i

export function artifactContentError(type: ArtifactKind | string, content: string): string | null {
    const body = String(content || '').trim()
    if (body.length < 8) return 'content is too short'
    if (type === 'react') return reactArtifactError(body)
    if (type === 'mermaid' && !MERMAID_HINT.test(body)) {
        return 'content must be mermaid source (flowchart, sequence, or similar)'
    }
    return null
}

export function reactArtifactError(source: string): string | null {
    const text = String(source || '')
    if (!text.trim()) return 'React source is empty'
    if (!/\bexport\s+default\b/.test(text) && !/\bfunction\s+[A-Z][A-Za-z0-9]*/.test(text)) {
        return 'React artifact must export default function ComponentName'
    }
    if (/className=["'][^"']*$/m.test(text) || /className=["']\s*\n/.test(text)) {
        return 'JSX className string looks unterminated; finish the string and call create_artifact again'
    }
    if (/<[A-Za-z][^>]*$/.test(text.trim())) {
        return 'JSX looks truncated; close tags and call create_artifact again'
    }
    if (/(?:return\s*\(?|=>\s*\(?)\s*<[\s\S]{0,1200}\b(?:const|let|var)\s+/.test(text)) {
        return 'Do not declare const/let inside JSX. Move data above return and call create_artifact again'
    }
    return null
}
