import React, { useEffect, useMemo, useState } from 'react'
import { SandpackPreview, SandpackProvider, useErrorMessage } from '@codesandbox/sandpack-react'
import { WIM_UI_SOURCE } from './wimUiSource'
import { SHADCN_THEME_CSS } from './shadcnTheme'
import { jsxSourceLooksBroken, prepareSandpackSource } from './reactPreview'
import { ensureSubtleDigest } from './ensureSubtleDigest'
import { LocalPreviewIframe } from './LocalPreviewIframe'

if (typeof window !== 'undefined') ensureSubtleDigest()

const SANDBOX_DEPENDENCIES = {
    'lucide-react': '^0.292.0',
    recharts: '^2.10.3',
    'framer-motion': '^10.16.4',
    'tailwind-merge': '^2.2.0',
    clsx: '^2.1.0',
}

const FATAL_SANDBOX_ERROR =
    /Cannot assign to read only property ['"]message['"]|Unexpected token|Unterminated string|Missing semicolon|expected ["'}]/i

async function preparedSourceParses(code: string): Promise<boolean> {
    try {
        const babelParser = await import('@babel/parser')
        babelParser.parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'],
            allowReturnOutsideFunction: true,
        })
        return true
    } catch (error) {
        if (error instanceof Error && /Cannot find module|Failed to fetch/.test(error.message)) {
            return true
        }
        return false
    }
}

function SandpackFatalWatch({ onFatalError }: { onFatalError?: (message: string) => void }) {
    const message = useErrorMessage() || ''

    useEffect(() => {
        if (!onFatalError || !message) return
        if (FATAL_SANDBOX_ERROR.test(message)) onFatalError(message)
    }, [message, onFatalError])

    return null
}

export function SandpackPreviewFrame({
    source,
    title,
    className,
    onFatalError,
    onHealed,
}: {
    source: string
    title?: string
    className?: string
    onFatalError?: (message: string) => void
    onHealed?: (nextSource: string) => void
}) {
    const prepared = useMemo(() => prepareSandpackSource(source), [source])
    const files = useMemo(
        () => ({
            '/App.tsx': prepared,
            '/wim-ui.tsx': WIM_UI_SOURCE,
            '/shadcn.css': SHADCN_THEME_CSS,
        }),
        [prepared]
    )
    const [gate, setGate] = useState<'pending' | 'ok' | 'local'>('pending')

    useEffect(() => {
        let cancelled = false
        setGate('pending')
        const reject = () => {
            if (cancelled) return
            setGate('local')
        }

        if (jsxSourceLooksBroken(prepared)) {
            reject()
            return () => {
                cancelled = true
            }
        }

        void preparedSourceParses(prepared).then((ok) => {
            if (cancelled) return
            if (ok) setGate('ok')
            else reject()
        })

        return () => {
            cancelled = true
        }
    }, [prepared, onFatalError])

    if (gate === 'local') {
        return (
            <LocalPreviewIframe
                source={source}
                title={title || 'Preview'}
                className={className}
                onHealed={onHealed}
            />
        )
    }

    if (gate !== 'ok') {
        return (
            <div className="flex h-full items-center justify-center bg-white px-4 text-[13px] text-slate-500">
                Preparing preview…
            </div>
        )
    }

    return (
        <div className={className || 'h-full w-full bg-white'}>
            <SandpackProvider
                template="react-ts"
                theme="light"
                files={files}
                customSetup={{ dependencies: SANDBOX_DEPENDENCIES }}
                options={{
                    externalResources: ['https://cdn.tailwindcss.com'],
                    initMode: 'immediate',
                    classes: {
                        'sp-wrapper': '!h-full !w-full !border-none !rounded-none',
                        'sp-layout': '!h-full !border-none',
                        'sp-preview': '!h-full !border-none',
                        'sp-preview-container': '!h-full',
                        'sp-preview-iframe': '!h-full',
                    },
                }}
                style={{ height: '100%', width: '100%' }}
            >
                <SandpackFatalWatch onFatalError={onFatalError} />
                <SandpackPreview
                    showNavigator={false}
                    showOpenInCodeSandbox={false}
                    showRefreshButton
                    showRestartButton={false}
                    style={{ height: '100%', width: '100%', border: 'none' }}
                />
            </SandpackProvider>
        </div>
    )
}
