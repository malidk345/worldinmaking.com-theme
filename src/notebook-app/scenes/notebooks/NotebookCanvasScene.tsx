import { useMemo, useState, useRef } from 'react'
import { IconEllipsis } from '@posthog/icons'
import OSButton from 'components/OSButton'
import MenuBar from 'components/RadixUI/MenuBar'
import { uuid } from '../../lib/utils/dom'
import { MarkdownNotebook } from '../../lib/components/MarkdownNotebook/MarkdownNotebook'
import { buildExtraInsertCommands } from './extraInsertCommands.tsx'
import { createNotebook } from './notebookStorage'
import { NOTEBOOK_PRODUCT_SCOPE_CLASS } from '../../../lib/lemon/ensureNotebookProductStyles'

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
        <div className="NotebookCanvasScene flex flex-col min-h-[80vh]">
            <header className="flex items-center justify-between mb-3 pb-2.5 border-b border-primary gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                    <h2 className="text-xl font-bold m-0">Canvas</h2>
                    <span className="text-xs text-muted">Scratch pad — save when you want to keep it.</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <MenuBar
                        triggerAsChild
                        menus={[
                            {
                                hideChevron: true,
                                trigger: (
                                    <button
                                        type="button"
                                        aria-label="Canvas options"
                                        className="flex items-center justify-center size-7 text-muted hover:text-primary hover:bg-accent rounded"
                                    >
                                        <IconEllipsis className="size-4" />
                                    </button>
                                ),
                                items: [
                                    { type: 'item', label: 'Clear canvas', onClick: handleClear },
                                    { type: 'item', label: 'Export as JSON', onClick: handleExportJSON },
                                    {
                                        type: 'item',
                                        label: 'Load from JSON',
                                        onClick: () => fileInputRef.current?.click(),
                                    },
                                ],
                            },
                        ]}
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={handleLoadJSON}
                    />
                    <OSButton variant="primary" size="sm" onClick={handleSaveAsNotebook}>
                        Save as notebook
                    </OSButton>
                </div>
            </header>
            <div className={`flex-1 min-w-0 ${NOTEBOOK_PRODUCT_SCOPE_CLASS}`}>
                <MarkdownNotebook
                    value={content}
                    onChange={(newContent: string) => setContent(newContent)}
                    mode="edit"
                    extraInsertCommands={buildExtraInsertCommands}
                    placeholder="Type / to insert a block, or just start writing…"
                />
            </div>
        </div>
    )
}
