import dynamic from 'next/dynamic'
import { parseChartSpec } from '../../../../lib/ai/chart-artifacts'
import {
    isNotebookChartFence,
    isNotebookHtmlFence,
    isNotebookReactFence,
} from '../../../../lib/notebook-artifact-block'

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

export function isNotebookLiveCodeBlock(node: NotebookCodeBlockNode): boolean {
    return isNotebookChartFence(node.language) || isNotebookReactFence(node.language) || isNotebookHtmlFence(node.language)
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
            className="MarkdownNotebook__wim-block my-3 overflow-hidden rounded-xl border border-border bg-[var(--color-bg-surface-primary)]"
            ref={setBlockRef}
            contentEditable={false}
            data-markdown-notebook-node-id={node.id}
        >
            {spec ? (
                <div data-testid="notebook-chart-block">
                    {spec.title ? (
                        <div className="border-b border-primary px-3 py-2 text-[13px] font-semibold text-primary">
                            {spec.title}
                        </div>
                    ) : null}
                    <div className="px-2 py-2">
                        <ChartArtifactRenderer spec={{ ...spec, title: undefined }} chrome={false} />
                    </div>
                </div>
            ) : isNotebookReactFence(language) || isNotebookHtmlFence(language) ? (
                <div className="h-[360px] w-full" data-testid="notebook-ui-block">
                    <ReactPreviewIframe title="Notebook preview" source={node.text} className="h-full w-full border-none" />
                </div>
            ) : (
                <pre className="m-0 overflow-auto p-4 text-[13px]">{node.text}</pre>
            )}
        </div>
    )
}
