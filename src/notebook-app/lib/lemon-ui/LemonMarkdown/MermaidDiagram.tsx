import { useEffect, useState } from 'react'

import { CodeSnippet, Language } from 'lib/components/CodeSnippet'
import { Spinner } from 'lib/lemon-ui/Spinner'
import { renderMermaidSvg } from '../../../../lib/mermaid-utils'

export interface MermaidDiagramProps {
    code: string
    className?: string
    /** Render at the diagram's intrinsic width instead of shrinking to fit the container.
     * Use inside a horizontally scrollable wrapper so wide diagrams scroll rather than becoming unreadably small. */
    naturalWidth?: boolean
}

function hostIsDark(): boolean {
    if (typeof document === 'undefined') return false
    return (
        document.body?.classList.contains('dark') ||
        document.documentElement?.classList.contains('dark') ||
        document.documentElement?.dataset?.notebookHostTheme === 'dark'
    )
}

export function MermaidDiagram({ code, className, naturalWidth = false }: MermaidDiagramProps): JSX.Element {
    const [svg, setSvg] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)

        renderMermaidSvg(code, {
            theme: hostIsDark() ? 'dark' : 'default',
            naturalWidth,
        })
            .then((markup) => {
                if (cancelled) return
                setSvg(markup)
            })
            .catch((err: unknown) => {
                if (cancelled) return
                setError(err instanceof Error ? err.message : 'Unable to render diagram')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [code, naturalWidth])

    if (error) {
        return (
            <div className={className} data-attr="mermaid-error">
                <div className="mb-1 text-xs text-danger">Could not render Mermaid diagram: {error}</div>
                <CodeSnippet language={Language.Text} compact wrap>
                    {code}
                </CodeSnippet>
            </div>
        )
    }

    if (loading && !svg) {
        return (
            <div className={`flex items-center justify-center p-4 ${className ?? ''}`} data-attr="mermaid-loading">
                <Spinner />
            </div>
        )
    }

    return (
        <div
            className={`LemonMarkdown__mermaid ${className ?? ''}`}
            data-attr="mermaid-rendered"
            // mermaid sanitizes output via securityLevel: 'strict'
            dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
        />
    )
}

export default MermaidDiagram
