import type { ChartSpec } from '../ai/chart-artifacts'

/** What the user asked the model to produce. One winner per turn. */
export type ArtifactIntent = 'chat' | 'react_ui' | 'mermaid' | 'chart' | 'table' | 'markdown' | 'code'

/** Canonical artifact kinds. Same union as the SSE/workspace document. */
export type ArtifactKind = 'code' | 'html' | 'svg' | 'markdown' | 'react' | 'json' | 'table' | 'mermaid' | 'chart' | 'posthog-analytics'

export type ArtifactDocument = {
    id: string
    identifier?: string
    title: string
    type: ArtifactKind
    language?: string
    content: string
    chartSpec?: ChartSpec
    description?: string
    version: number
    createdAt: string
}

export type ArtifactTurn = {
    intent: ArtifactIntent
    artifacts: ArtifactDocument[]
    visibleText: string
}
