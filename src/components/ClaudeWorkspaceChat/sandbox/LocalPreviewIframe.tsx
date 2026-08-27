import React, { useEffect, useRef, useState } from 'react'
import { buildLoadingSrcDoc, buildReactPreviewSrcDoc } from './reactPreview'

export type LocalPreviewProps = {
    source: string
    title: string
    className?: string
    onHealed?: (nextSource: string) => void
}

type PreviewStatus = 'loading' | 'ready' | 'healing' | 'failed'

async function requestUiRepair(source: string, error: string): Promise<string | null> {
    try {
        const res = await fetch('/api/repair-ui', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, error: error.slice(0, 800) }),
        })
        const data = (await res.json().catch(() => null)) as { ok?: boolean; content?: string } | null
        return data?.ok && data.content ? data.content : null
    } catch {
        return null
    }
}

export function LocalPreviewIframe({ source, title, className, onHealed }: LocalPreviewProps) {
    const [srcDoc, setSrcDoc] = useState(buildLoadingSrcDoc)
    const [status, setStatus] = useState<PreviewStatus>('loading')
    const [retryKey, setRetryKey] = useState(0)
    const onHealedRef = useRef(onHealed)
    onHealedRef.current = onHealed

    useEffect(() => {
        let cancelled = false
        setStatus('loading')
        setSrcDoc(buildLoadingSrcDoc())

        const run = async () => {
            try {
                const html = await buildReactPreviewSrcDoc(source)
                if (!cancelled) {
                    setSrcDoc(html)
                    setStatus('ready')
                }
                return
            } catch (err) {
                if (cancelled) return
                const detail = err instanceof Error ? err.message : String(err || 'Preview failed')
                setStatus('healing')
                const repaired = await requestUiRepair(source, detail)
                if (cancelled) return
                if (!repaired) {
                    setStatus('failed')
                    return
                }
                try {
                    const html = await buildReactPreviewSrcDoc(repaired)
                    if (cancelled) return
                    setSrcDoc(html)
                    setStatus('ready')
                    onHealedRef.current?.(repaired)
                } catch {
                    if (!cancelled) setStatus('failed')
                }
            }
        }

        void run()
        return () => {
            cancelled = true
        }
    }, [source, retryKey])

    const frameClass = className || 'h-full w-full border-none bg-primary'

    if (status === 'healing' || status === 'loading') {
        return (
            <div className={`flex flex-col items-center justify-center gap-2 bg-primary px-6 text-center ${frameClass}`}>
                <p className="m-0 text-[13px] text-secondary">
                    {status === 'healing' ? 'Fixing the interface…' : 'Preparing preview…'}
                </p>
            </div>
        )
    }

    if (status === 'failed') {
        return (
            <div className={`flex flex-col items-center justify-center gap-3 bg-primary px-6 text-center ${frameClass}`}>
                <p className="m-0 text-[14px] font-medium text-primary">Preview could not be built</p>
                <p className="m-0 max-w-sm text-[13px] text-secondary">
                    The generated UI did not compile. Retry and we will simplify the same screen.
                </p>
                <button
                    type="button"
                    className="rounded border border-primary bg-primary px-3 py-1.5 text-[13px] text-primary hover:bg-accent"
                    onClick={() => setRetryKey((value) => value + 1)}
                >
                    Try again
                </button>
            </div>
        )
    }

    return (
        <iframe
            title={title}
            srcDoc={srcDoc}
            className={frameClass}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
        />
    )
}
