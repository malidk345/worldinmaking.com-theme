import React, { Suspense, lazy } from 'react'
import dynamic from 'next/dynamic'
import { parseChartSpec } from '../../../../lib/ai/chart-artifacts'
import {
    isNotebookChartFence,
    isNotebookHtmlFence,
    isNotebookMermaidFence,
    isNotebookReactFence,
    isNotebookSvgFence,
} from '../../../../lib/notebook-artifact-block'
import { Spinner } from '../../lemon-ui/Spinner'
import { NotebookCodeBlockNode } from './types'

const ChartArtifactRenderer = dynamic(
    () =>
        import('../../../../components/ClaudeWorkspaceChat/components/ChartArtifactRenderer').then(
            (module) => module.ChartArtifactRenderer
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

const LazyMermaidDiagram = lazy(() => import('../../lemon-ui/LemonMarkdown/MermaidDiagram'))

export function isNotebookLiveCodeBlock(node: NotebookCodeBlockNode): boolean {
    return (
        isNotebookChartFence(node.language) ||
        isNotebookReactFence(node.language) ||
        isNotebookHtmlFence(node.language) ||
        isNotebookMermaidFence(node.language) ||
        isNotebookSvgFence(node.language)
    )
}

export function NotebookWimCodeBlock({
    node,
    setBlockRef,
}: {
    node: NotebookCodeBlockNode
    setBlockRef: (element: HTMLElement | null) => void
}): JSX.Element {
    const language = node.language || ''
    const spec = isNotebookChartFence(language) ? parseChartSpec(node.text) : null

    return (
        <div
            className="MarkdownNotebook__wim-block my-3 overflow-hidden rounded-xl bg-transparent"
            ref={setBlockRef}
            contentEditable={false}
            data-markdown-notebook-node-id={node.id}
        >
            {spec ? (
                <div data-testid="notebook-chart-block" className="py-2">
                    <ChartArtifactRenderer spec={{ ...spec, title: undefined }} chrome={false} />
                </div>
            ) : isNotebookMermaidFence(language) ? (
                <div className="flex justify-center p-3">
                    <Suspense fallback={<div className="p-4 flex justify-center"><Spinner /></div>}>
                        <LazyMermaidDiagram code={node.text} naturalWidth />
                    </Suspense>
                </div>
            ) : isNotebookSvgFence(language) ? (
                <div
                    className="p-2 flex items-center justify-center overflow-auto"
                    dangerouslySetInnerHTML={{ __html: node.text }}
                />
            ) : isNotebookReactFence(language) || isNotebookHtmlFence(language) ? (
                <div className="h-[380px] w-full rounded-xl overflow-hidden border border-border bg-white" data-testid="notebook-ui-block">
                    <ReactPreviewIframe
                        title="Preview"
                        source={node.text}
                        className="h-full w-full border-none"
                    />
                </div>
            ) : (
                <pre className="m-0 overflow-auto p-4 text-[13px]">{node.text}</pre>
            )}
        </div>
    )
}
