import { useMemo, useState, useRef } from 'react'
import { LemonButton, LemonMenu } from '~nb-lib/lemon-ui/index'
import { IconEllipsis } from '@posthog/icons'
import { uuid } from '../../lib/utils/dom'
import { MarkdownNotebook } from '../../lib/components/MarkdownNotebook/MarkdownNotebook'
import { NOTEBOOK_MARKDOWN_REGISTRY } from './markdownNotebookRegistry'
import { buildExtraInsertCommands } from './extraInsertCommands.tsx'
import { createNotebook } from './notebookStorage'

interface NotebookCanvasSceneProps {
    onSaveAsNotebook?: (id: string) => void
}

export function NotebookCanvasScene({ onSaveAsNotebook }: NotebookCanvasSceneProps) {
    const canvasId = useMemo(() => uuid(), [])
    const [content, setContent] = useState('# Canvas\n\nStart exploring here...')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleClear = () => {
        setContent('# Canvas\n\n')
    }

    const handleExportJSON = () => {
        const data = JSON.stringify({ title: 'Canvas', content }, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `canvas-${canvasId.slice(0, 8)}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleLoadJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target?.result as string)
                if (parsed.content) {
                    setContent(parsed.content)
                }
            } catch (err) {
                console.error('Failed to parse JSON', err)
            }
        }
        reader.readAsText(file)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSaveAsNotebook = () => {
        const nb = createNotebook('Canvas Notebook', content)
        if (onSaveAsNotebook) {
            onSaveAsNotebook(nb.id)
        }
    }

    return (
        <div className="NotebookCanvasScene flex flex-col" style={{ minHeight: '80vh' }}>
            <header className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold m-0">Canvas</h2>
                    <span className="text-xs text-muted">Temporary — not saved until you choose "Save as Notebook"</span>
                </div>
                <div className="flex items-center gap-2">
                    <LemonMenu
                        items={[
                            { label: 'Clear canvas', onClick: handleClear },
                            { label: 'Export as JSON', onClick: handleExportJSON },
                            { label: 'Load from JSON', onClick: () => fileInputRef.current?.click() },
                        ]}
                    >
                        <LemonButton size="small" icon={<IconEllipsis />} />
                    </LemonMenu>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".json"
                        onChange={handleLoadJSON}
                    />
                    <LemonButton type="primary" size="small" onClick={handleSaveAsNotebook}>
                        Save as Notebook
                    </LemonButton>
                </div>
            </header>
            <div className="flex-1">
                <MarkdownNotebook
                    value={content}
                    onChange={(newContent: string) => setContent(newContent)}
                    registry={NOTEBOOK_MARKDOWN_REGISTRY}
                    extraInsertCommands={(api) => buildExtraInsertCommands(api)}
                />
            </div>
        </div>
    )
}
