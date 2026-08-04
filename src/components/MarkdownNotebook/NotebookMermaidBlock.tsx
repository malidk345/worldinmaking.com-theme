import { Suspense, lazy } from 'react'

import { Spinner } from 'components/LemonUI/Spinner'

import { NotebookCodeBlockNode } from './types'

function SimpleMermaidDiagram({ code }: { code: string }) {
    return <pre className="p-4 bg-[#111216] border border-[#2c2d38] rounded text-xs text-slate-200 overflow-x-auto">{code}</pre>
}

export function isMermaidCodeBlock(node: NotebookCodeBlockNode): boolean {
    return node.language?.toLowerCase() === 'mermaid'
}

export function NotebookMermaidBlock({
    node,
    setBlockRef,
}: {
    node: NotebookCodeBlockNode
    setBlockRef: (element: HTMLElement | null) => void
}): JSX.Element {
    return (
        <div
            className="MarkdownNotebook__mermaid-block"
            ref={setBlockRef}
            contentEditable={false}
            data-markdown-notebook-node-id={node.id}
        >
            <Suspense
                fallback={
                    <div className="flex items-center justify-center p-4">
                        <Spinner />
                    </div>
                }
            >
                <SimpleMermaidDiagram code={node.text} />
            </Suspense>
        </div>
    )
}
