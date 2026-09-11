import { useEffect, useState } from 'react'

import { wasNotebookNodeJustInserted } from './freshlyInserted'
import type { NotebookComponentRenderProps } from './types'

type KatexApi = {
    renderToString: (tex: string, options: Record<string, unknown>) => string
}

function loadKatex(): Promise<KatexApi> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('no window'))
    }
    const existing = (window as Window & { katex?: KatexApi }).katex
    if (existing) return Promise.resolve(existing)

    if (!document.getElementById('wim-katex-css')) {
        const link = document.createElement('link')
        link.id = 'wim-katex-css'
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css'
        document.head.appendChild(link)
    }

    return new Promise((resolve, reject) => {
        const ready = (): void => {
            const api = (window as Window & { katex?: KatexApi }).katex
            if (api) resolve(api)
            else reject(new Error('katex missing'))
        }
        const present = document.getElementById('wim-katex-js') as HTMLScriptElement | null
        if (present) {
            present.addEventListener('load', ready, { once: true })
            present.addEventListener('error', () => reject(new Error('katex script')), { once: true })
            if ((window as Window & { katex?: KatexApi }).katex) ready()
            return
        }
        const script = document.createElement('script')
        script.id = 'wim-katex-js'
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js'
        script.async = true
        script.onload = ready
        script.onerror = () => reject(new Error('katex script'))
        document.head.appendChild(script)
    })
}

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
        void loadKatex()
            .then((katex) => {
                const rendered = katex.renderToString(content, {
                    throwOnError: false,
                    displayMode: true,
                    output: 'html',
                })
                if (!cancelled) {
                    setHtml(rendered)
                    setFailed(false)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setHtml('')
                    setFailed(true)
                }
            })
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
