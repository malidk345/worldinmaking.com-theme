import type { ArtifactKind } from './kinds'

export type ArtifactPreview = 'sandbox' | 'mermaid' | 'chart' | 'html' | 'markdown' | 'code' | 'canvas' | 'model3d'

export type ArtifactRenderer = {
    kind: ArtifactKind
    label: string
    notebookFence: string | null
    preview: ArtifactPreview
    autoOpen: boolean
}

export const ARTIFACT_RENDERERS: Record<ArtifactKind, ArtifactRenderer> = {
    mermaid: { kind: 'mermaid', label: 'diagram', notebookFence: 'mermaid', preview: 'mermaid', autoOpen: true },
    chart: { kind: 'chart', label: 'chart', notebookFence: 'chart', preview: 'chart', autoOpen: true },
    'posthog-analytics': { kind: 'posthog-analytics', label: 'analytics', notebookFence: 'posthog-analytics', preview: 'chart', autoOpen: true },
    react: { kind: 'react', label: 'screen', notebookFence: 'react', preview: 'sandbox', autoOpen: true },
    html: { kind: 'html', label: 'screen', notebookFence: 'html', preview: 'html', autoOpen: true },
    svg: { kind: 'svg', label: 'SVG', notebookFence: 'svg', preview: 'html', autoOpen: true },
    table: { kind: 'table', label: 'table', notebookFence: null, preview: 'markdown', autoOpen: false },
    markdown: { kind: 'markdown', label: 'document', notebookFence: null, preview: 'markdown', autoOpen: false },
    json: { kind: 'json', label: 'JSON', notebookFence: 'json', preview: 'code', autoOpen: false },
    code: { kind: 'code', label: 'code', notebookFence: 'code', preview: 'code', autoOpen: false },
    canvas: { kind: 'canvas', label: 'canvas', notebookFence: 'canvas', preview: 'canvas', autoOpen: true },
    model3d: { kind: 'model3d', label: '3D scene', notebookFence: 'model3d', preview: 'model3d', autoOpen: true },
    simulation: { kind: 'simulation', label: 'simulation', notebookFence: 'simulation', preview: 'chart', autoOpen: true },
}

export function getRenderer(kind: ArtifactKind): ArtifactRenderer {
    return ARTIFACT_RENDERERS[kind] || ARTIFACT_RENDERERS.markdown
}

export function artifactPlaceholder(artifact: { type: ArtifactKind; title: string; version?: number }): string {
    const renderer = getRenderer(artifact.type)
    const title = artifact.title || 'Untitled'
    if (renderer.preview === 'sandbox' || renderer.preview === 'html') {
        return `Opened **"${title}"** in the preview workspace.`
    }
    return `Created **"${title}"** (${renderer.label} v${artifact.version || 1}). Open the card below to review it.`
}
