import React, { Component, useCallback, useEffect, useState } from 'react'
import { LocalPreviewIframe, type LocalPreviewProps } from './LocalPreviewIframe'

type PreviewProps = LocalPreviewProps

class PreviewErrorBoundary extends Component<
    PreviewProps & { children: React.ReactNode },
    { failed: boolean }
> {
    state = { failed: false }

    static getDerivedStateFromError() {
        return { failed: true }
    }

    componentDidCatch() {
        // Sandpack can throw SyntaxError while its webpack chunk evaluates.
        // Fall back to the local iframe so the workspace stays usable.
    }

    render() {
        if (this.state.failed) {
            return <LocalPreviewIframe {...this.props} />
        }
        return this.props.children
    }
}

type SandpackFrameProps = PreviewProps & {
    onFatalError?: (message: string) => void
    onHealed?: (nextSource: string) => void
}

export function ReactPreviewIframe(props: PreviewProps) {
    const [Frame, setFrame] = useState<React.ComponentType<SandpackFrameProps> | null>(null)
    const [useLocal, setUseLocal] = useState(false)
    const handleFatalError = useCallback(() => setUseLocal(true), [])

    useEffect(() => {
        setUseLocal(false)
    }, [props.source])

    useEffect(() => {
        let cancelled = false
        import('./SandpackPreviewFrame')
            .then((module) => {
                if (!cancelled) setFrame(() => module.SandpackPreviewFrame)
            })
            .catch(() => {
                if (!cancelled) setUseLocal(true)
            })
        return () => {
            cancelled = true
        }
    }, [])

    if (useLocal) return <LocalPreviewIframe {...props} />
    if (!Frame) {
        return (
            <div className="flex h-full items-center justify-center bg-white px-4 text-[13px] text-slate-500">
                Preparing sandbox…
            </div>
        )
    }

    return (
        <PreviewErrorBoundary key={props.source} {...props}>
            <Frame {...props} onFatalError={handleFatalError} />
        </PreviewErrorBoundary>
    )
}
