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

    if (status === 'healing' || status === 'loading') {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-white px-6 text-center">
                <p className="m-0 text-[13px] text-slate-600">
                    {status === 'healing' ? 'Fixing the interface…' : 'Preparing preview…'}
                </p>
                <p className="m-0 text-[12px] text-slate-400">Repairing the code instead of showing a compiler dump.</p>
            </div>
        )
    }

    if (status === 'failed') {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-white px-6 text-center">
                <p className="m-0 text-[14px] font-medium text-slate-800">Preview could not be built</p>
                <p className="m-0 max-w-sm text-[13px] text-slate-500">
                    The generated UI did not compile. Retry and we will simplify the same screen.
                </p>
                <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-800 hover:bg-slate-50"
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
            className={className || 'h-full w-full border-none bg-white'}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
        />
    )
}
