import { useEffect, useState } from 'react'

import { wasNotebookNodeJustInserted } from './freshlyInserted'
import type { NotebookComponentRenderProps } from './types'

export function LatexView({ node }: NotebookComponentRenderProps): JSX.Element {
    const content = typeof node.props.content === 'string' ? node.props.content : ''
    const [html, setHtml] = useState('')
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        let cancelled = false
        if (!content.trim()) {
            setHtml('')
            setFailed(false)
            return
        }
        void (async () => {
            try {
                const katex = await import('katex')
                await import('katex/dist/katex.min.css')
                const rendered = katex.default.renderToString(content, {
                    throwOnError: false,
                    displayMode: true,
                    output: 'html',
                })
                if (!cancelled) {
                    setHtml(rendered)
                    setFailed(false)
                }
            } catch {
                if (!cancelled) {
                    setHtml('')
                    setFailed(true)
                }
            }
        })()
        return () => {
            cancelled = true
        }
    }, [content])

    if (!content.trim()) {
        return <div className="MarkdownNotebook__latex MarkdownNotebook__latex--empty">Empty formula</div>
    }
    if (html) {
        return (
            <div
                className="MarkdownNotebook__latex"
                data-attr="notebook-latex"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        )
    }
    return (
        <div className="MarkdownNotebook__latex" data-attr="notebook-latex">
            <code>{content}</code>
            {failed ? <p className="text-xs text-muted m-0 mt-1">Formula shown as text until KaTeX loads.</p> : null}
        </div>
    )
}

export function LatexEdit({ node, updateProps }: NotebookComponentRenderProps): JSX.Element {
    const content = typeof node.props.content === 'string' ? node.props.content : ''
    return (
        <div className="MarkdownNotebook__component-form">
            <textarea
                value={content}
                onChange={(event) => updateProps({ content: event.target.value })}
                placeholder="E = mc^2"
                rows={3}
                autoFocus={wasNotebookNodeJustInserted(node.id)}
                className="notebook-native-field w-full rounded-sm border border-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted font-mono"
            />
            <LatexView node={node} updateProps={updateProps} deleteNode={() => {}} mode="view" />
        </div>
    )
}
