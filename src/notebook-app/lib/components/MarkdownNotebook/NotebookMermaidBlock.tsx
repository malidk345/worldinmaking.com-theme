import dynamic from 'next/dynamic'
import { IconTrash } from '@posthog/icons'
import OSButton from 'components/OSButton'

import { isMermaidLanguage, isMermaidSource } from '../../../../lib/mermaid-loader'
import { NotebookCodeBlockNode, NotebookMode } from './types'

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
    mode = 'view',
    deleteNode,
}: {
    node: NotebookCodeBlockNode
    setBlockRef: (element: HTMLElement | null) => void
    mode?: NotebookMode
    deleteNode?: () => void
}): JSX.Element {
    return (
        <div
            className="MarkdownNotebook__mermaid-block group/mermaid-block relative my-3 flex justify-center overflow-auto focus:outline-none"
            ref={setBlockRef}
            contentEditable={false}
            data-markdown-notebook-node-id={node.id}
            data-testid="notebook-mermaid-block"
            tabIndex={mode === 'edit' ? 0 : undefined}
            onKeyDown={(e) => {
                if (mode === 'edit' && (e.key === 'Backspace' || e.key === 'Delete')) {
                    e.preventDefault()
                    e.stopPropagation()
                    deleteNode?.()
                }
            }}
        >
            {mode === 'edit' && deleteNode ? (
                <div
                    className="absolute top-2 right-2 z-30 flex items-center gap-1 rounded-md bg-primary/90 px-1.5 py-0.5 shadow-sm border border-primary/40 backdrop-blur-md opacity-0 group-hover/mermaid-block:opacity-100 focus-within:opacity-100 transition-opacity duration-150"
                    contentEditable={false}
                >
                    <span className="text-[10px] font-mono text-muted uppercase px-1 py-0.5 select-none tracking-wider">
                        mermaid
                    </span>
                    <OSButton
                        size="xs"
                        icon={<IconTrash />}
                        tooltip="Delete block"
                        aria-label="Delete block"
                        onClick={(e) => {
                            e.stopPropagation()
                            deleteNode()
                        }}
                    />
                </div>
            ) : null}
            <MermaidPreview code={node.text} naturalWidth />
        </div>
    )
}
