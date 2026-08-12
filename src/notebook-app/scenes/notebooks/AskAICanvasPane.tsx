import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { LemonButton, LemonTag } from '~nb-lib/lemon-ui/index'
import {
    IconX,
    IconCopy,
    IconCheck,
    IconPlus,
    IconTable,
    IconSparkles,
    IconPencil,
    IconDownload,
} from '@posthog/icons'

const Mermaid = dynamic(() => import('components/Mermaid'), { ssr: false })

export interface CanvasArtifact {
    id: string
    title: string
    type: 'code' | 'mermaid' | 'table' | 'markdown'
    content: string
    language?: string
}

export interface AskAICanvasPaneProps {
    artifacts: CanvasArtifact[]
    activeArtifactId?: string
    onClose: () => void
    onInsert: (content: string) => void
}

export function AskAICanvasPane({
    artifacts,
    activeArtifactId,
    onClose,
    onInsert,
}: AskAICanvasPaneProps): JSX.Element {
    const [selectedId, setSelectedId] = useState<string>(activeArtifactId || artifacts[0]?.id || '')
    const [copied, setCopied] = useState(false)

    const activeArtifact = artifacts.find((a) => a.id === selectedId) || artifacts[0]

    const handleCopy = () => {
        if (!activeArtifact) return
        navigator.clipboard.writeText(activeArtifact.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownload = () => {
        if (!activeArtifact) return
        const blob = new Blob([activeArtifact.content], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const ext = activeArtifact.type === 'mermaid' ? 'mmd' : activeArtifact.language || 'txt'
        a.download = `artifact-${activeArtifact.id}.${ext}`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (!activeArtifact) return <></>

    return (
        <div className="flex flex-col h-full w-full bg-bg-light/95 dark:bg-dark/95 backdrop-blur-xl border-l border-border/40 shadow-2xl overflow-hidden transition-all duration-300">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-accent-light/30 dark:bg-accent-dark/30 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto min-w-0">
                    <IconSparkles className="w-4 h-4 text-link shrink-0" />
                    <span className="font-semibold text-xs text-primary truncate mr-2">Artifact Canvas</span>
                    
                    <div className="flex items-center gap-1">
                        {artifacts.map((art) => (
                            <button
                                key={art.id}
                                onClick={() => setSelectedId(art.id)}
                                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                                    art.id === activeArtifact.id
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'text-muted hover:text-primary hover:bg-primary/10'
                                }`}
                            >
                                {art.title}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <LemonButton
                        type="secondary"
                        size="small"
                        icon={copied ? <IconCheck /> : <IconCopy />}
                        onClick={handleCopy}
                        title="Copy content"
                    >
                        {copied ? 'Copied' : 'Copy'}
                    </LemonButton>

                    <LemonButton
                        type="secondary"
                        size="small"
                        icon={<IconDownload />}
                        onClick={handleDownload}
                        title="Download file"
                    />

                    <LemonButton
                        type="primary"
                        size="small"
                        icon={<IconPlus />}
                        onClick={() => onInsert(activeArtifact.content)}
                    >
                        Insert to Notebook
                    </LemonButton>

                    <button
                        onClick={onClose}
                        className="p-1 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors ml-1"
                        title="Close Canvas"
                    >
                        <IconX className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Artifact Content Area */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
                {activeArtifact.type === 'mermaid' ? (
                    <div className="p-4 bg-bg-light dark:bg-accent-dark/40 rounded-xl border border-border/40 flex justify-center items-center overflow-auto min-h-[300px]">
                        <Mermaid name={`canvas-mermaid-${activeArtifact.id}`}>{activeArtifact.content}</Mermaid>
                    </div>
                ) : activeArtifact.type === 'code' ? (
                    <div className="rounded-xl border border-border/40 bg-accent-dark/95 text-slate-100 p-4 overflow-x-auto font-mono text-xs shadow-inner">
                        <pre className="whitespace-pre">{activeArtifact.content}</pre>
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none text-xs font-sans">
                        <pre className="bg-accent-light/40 dark:bg-accent-dark/40 p-4 rounded-xl border border-border/40 whitespace-pre-wrap font-mono text-xs">
                            {activeArtifact.content}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}
