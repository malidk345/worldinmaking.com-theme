import dynamic from 'next/dynamic'

import { isMermaidLanguage, isMermaidSource } from '../../../../lib/mermaid-loader'
import { NotebookCodeBlockNode } from './types'

const MermaidPreview = dynamic(
    () => import('../../../../components/MermaidPreview').then((module) => module.MermaidPreview),
    { ssr: false }
)

export function isMermaidCodeBlock(node: NotebookCodeBlockNode): boolean {
    const lang = (node.language || '').toLowerCase().trim()
    const text = (node.text || '').trim()
    return isMermaidLanguage(lang) || isMermaidSource(text)
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
            className="MarkdownNotebook__mermaid-block my-3 flex justify-center overflow-auto"
            ref={setBlockRef}
            contentEditable={false}
            data-markdown-notebook-node-id={node.id}
            data-testid="notebook-mermaid-block"
        >
            <MermaidPreview code={node.text} naturalWidth />
        </div>
    )
}
