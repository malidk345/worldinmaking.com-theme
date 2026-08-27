import React, { useEffect, useState } from 'react'

import { renderMermaidSvg } from '../lib/mermaid-loader'

export interface MermaidPreviewProps {
    code: string
    className?: string
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

export function MermaidPreview({ code, className, naturalWidth = true }: MermaidPreviewProps): JSX.Element {
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
                setSvg(null)
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
            <div
                className={className}
                data-attr="mermaid-error"
                data-testid="mermaid-error"
            >
                <div className="mb-2 text-xs text-rose-700">Could not render Mermaid diagram: {error}</div>
                <pre className="m-0 overflow-auto whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50 p-3 font-mono text-[12px] text-rose-900">
                    {code}
                </pre>
            </div>
        )
    }

    if (loading && !svg) {
        return (
            <div
                className={`flex items-center justify-center p-6 text-xs text-secondary ${className ?? ''}`}
                data-attr="mermaid-loading"
                data-testid="mermaid-loading"
            >
                Rendering diagram…
            </div>
        )
    }

    return (
        <div
            className={`LemonMarkdown__mermaid w-full overflow-auto ${className ?? ''}`}
            data-attr="mermaid-rendered"
            data-testid="mermaid-rendered"
            // mermaid sanitizes via securityLevel: 'strict'
            dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
        />
    )
}

export default MermaidPreview
