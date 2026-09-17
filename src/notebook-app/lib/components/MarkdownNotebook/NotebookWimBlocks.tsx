import React from 'react'
import dynamic from 'next/dynamic'
import { parseChartSpec, parsePostHogAnalyticsSpec } from '../../../../lib/ai/chart-artifacts'
import { looksLikeReactSource } from '../../../../lib/ai/design-request'
import { wrapHtmlArtifactDocument } from '../../../../lib/wim-artifact-theme'
import { isMermaidLanguage, isMermaidSource } from '../../../../lib/mermaid-loader'
import {
    isNotebookCanvasFence,
    isNotebookChartFence,
    isNotebookHtmlFence,
    isNotebookMermaidFence,
    isNotebookModel3dFence,
    isNotebookReactFence,
    isNotebookSimulationFence,
    isNotebookSvgFence,
} from '../../../../lib/notebook-artifact-block'
import { parseCanvasSpec, parseModel3DSpecStrict, parseSimulationSpec } from '../../../../lib/ai/visual-artifacts'
import { NotebookCodeBlockNode } from './types'

const ChartArtifactRenderer = dynamic(
    () =>
        import('../../../../components/ClaudeWorkspaceChat/components/ChartArtifactRenderer').then(
            (module) => module.ChartArtifactRenderer
        ),
    { ssr: false }
)

const PostHogAnalyticsDashboard = dynamic(
    () =>
        import('../../../../components/PostHogAnalytics').then(
            (module) => module.PostHogAnalyticsDashboard
        ),
    { ssr: false }
)

const ReactPreviewIframe = dynamic(
    () =>
        import('../../../../components/ClaudeWorkspaceChat/sandbox/ReactPreviewIframe').then(
            (module) => module.ReactPreviewIframe
        ),
    { ssr: false }
)

const MermaidPreview = dynamic(
    () => import('../../../../components/MermaidPreview').then((module) => module.MermaidPreview),
    { ssr: false }
)

const CanvasArtifactRenderer = dynamic(
    () =>
        import('../../../../components/ClaudeWorkspaceChat/components/CanvasArtifactRenderer').then(
            (module) => module.CanvasArtifactRenderer
        ),
    { ssr: false }
)

const Model3DArtifactRenderer = dynamic(
    () =>
        import('../../../../components/ClaudeWorkspaceChat/components/Model3DArtifactRenderer').then(
            (module) => module.Model3DArtifactRenderer
        ),
    { ssr: false }
)

const SimulationArtifactRenderer = dynamic(
    () =>
        import('../../../../components/ClaudeWorkspaceChat/components/SimulationArtifactRenderer').then(
            (module) => module.SimulationArtifactRenderer
        ),
    { ssr: false }
)

export function isNotebookLiveCodeBlock(node: NotebookCodeBlockNode): boolean {
    const lang = (node.language || '').toLowerCase().trim()
    const text = (node.text || '').trim()

    if (lang === 'posthog-analytics' || lang === 'analytics' || parsePostHogAnalyticsSpec(text) || parsePostHogAnalyticsSpec(node.text)) return true
    if (isNotebookChartFence(lang) || parseChartSpec(text)) return true
    if (isNotebookMermaidFence(lang) || isMermaidLanguage(lang) || isMermaidSource(text)) return true
    if (isNotebookSvgFence(lang) || (text.startsWith('<svg') && text.includes('</svg>'))) return true
    if (isNotebookReactFence(lang) || looksLikeReactSource(text)) return true
    if (isNotebookHtmlFence(lang) || /<!DOCTYPE\s+html|<html[\s>]/i.test(text)) return true
    if (isNotebookModel3dFence(lang) || parseModel3DSpecStrict(text)) return true
    if (isNotebookSimulationFence(lang) || parseSimulationSpec(text)) return true
    if (isNotebookCanvasFence(lang) || parseCanvasSpec(text)) return true

    return false
}

export function NotebookWimCodeBlock({
    node,
    setBlockRef,
}: {
    node: NotebookCodeBlockNode
    setBlockRef: (element: HTMLElement | null) => void
}): JSX.Element {
    const language = (node.language || '').toLowerCase().trim()
    const text = (node.text || '').trim()
    const postHogSpec = parsePostHogAnalyticsSpec(text) || parsePostHogAnalyticsSpec(node.text)
    const spec = !postHogSpec && (isNotebookChartFence(language) ? parseChartSpec(node.text) : parseChartSpec(text))
    const isMermaid = isNotebookMermaidFence(language) || isMermaidLanguage(language) || isMermaidSource(text)
    const isSvg = isNotebookSvgFence(language) || (text.startsWith('<svg') && text.includes('</svg>'))
    const isHtml =
        isNotebookHtmlFence(language) || /<!DOCTYPE\s+html|<html[\s>]/i.test(text)
    const isReact = !isHtml && (isNotebookReactFence(language) || looksLikeReactSource(text))
    const isCanvas = isNotebookCanvasFence(language) || Boolean(parseCanvasSpec(text))
    const isModel3d = isNotebookModel3dFence(language) || Boolean(parseModel3DSpecStrict(text))
    const isSimulation = isNotebookSimulationFence(language) || Boolean(parseSimulationSpec(text))

    return (
        <div
            className="MarkdownNotebook__wim-block my-3 overflow-hidden rounded-xl bg-transparent"
            ref={setBlockRef}
            contentEditable={false}
            data-markdown-notebook-node-id={node.id}
        >
            {postHogSpec ? (
                <div data-testid="notebook-posthog-analytics-block" className="py-2">
                    <PostHogAnalyticsDashboard spec={postHogSpec} />
                </div>
            ) : spec ? (
                <div data-testid="notebook-chart-block" className="py-2">
                    <ChartArtifactRenderer spec={{ ...spec, title: undefined }} chrome={false} />
                </div>
            ) : isModel3d ? (
                <div data-testid="notebook-model3d-block" className="relative h-[420px] w-full overflow-hidden rounded-xl border border-primary bg-primary">
                    <Model3DArtifactRenderer content={node.text} />
                </div>
            ) : isSimulation ? (
                <div data-testid="notebook-simulation-block" className="relative min-h-[320px] w-full overflow-auto rounded-xl border border-primary bg-primary">
                    <SimulationArtifactRenderer content={node.text} />
                </div>
            ) : isCanvas ? (
                <div data-testid="notebook-canvas-block" className="relative h-[420px] w-full overflow-hidden rounded-xl border border-primary bg-primary">
                    <CanvasArtifactRenderer content={node.text} />
                </div>
            ) : isMermaid ? (
                <div className="flex justify-center p-3 overflow-auto" data-testid="notebook-mermaid-block">
                    <MermaidPreview code={node.text} naturalWidth />
                </div>
            ) : isSvg ? (
                <div
                    className="p-2 flex items-center justify-center overflow-auto"
                    dangerouslySetInnerHTML={{ __html: node.text }}
                />
            ) : isReact ? (
                <div
                    className="relative h-[380px] w-full overflow-hidden rounded-xl border border-primary bg-primary"
                    data-testid="notebook-ui-block"
                >
                    <ReactPreviewIframe
                        title="Preview"
                        source={node.text}
                        className="absolute inset-0 h-full w-full border-none"
                    />
                </div>
            ) : isHtml ? (
                <div
                    className="relative h-[380px] w-full overflow-hidden rounded-xl border border-primary bg-primary"
                    data-testid="notebook-ui-block"
                >
                    <iframe
                        title="Preview"
                        srcDoc={wrapHtmlArtifactDocument(node.text)}
                        className="absolute inset-0 h-full w-full border-none bg-primary"
                        sandbox="allow-scripts"
                    />
                </div>
            ) : (
                <pre className="m-0 overflow-auto p-4 text-[13px]">{node.text}</pre>
            )}
        </div>
    )
}
