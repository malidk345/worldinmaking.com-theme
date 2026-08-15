import { useState, useRef, useEffect } from 'react'
import { LemonModal, LemonButton, LemonTag, LemonSelect } from '~nb-lib/lemon-ui/index'
import { IconSparkles, IconArrowRight, IconBook, IconPencil, IconSearch, IconChat } from '@posthog/icons'
import { PHILOSOPHER_BOTS } from '../../lib/philosophers'

export interface NotebookAIWriterModalProps {
    isOpen: boolean
    onClose: () => void
    onInsertContent: (generatedMarkdown: string) => void
}

const WRITER_MODES = [
    {
        title: 'Mode',
        options: [
            {
                value: 'write',
                label: (
                    <span className="flex items-center gap-1.5 text-xs">
                        <IconPencil className="w-3.5 h-3.5" />
                        <span>Write</span>
                    </span>
                ),
            },
            {
                value: 'research',
                label: (
                    <span className="flex items-center gap-1.5 text-xs">
                        <IconSearch className="w-3.5 h-3.5" />
                        <span>Research</span>
                    </span>
                ),
            },
            {
                value: 'debate',
                label: (
                    <span className="flex items-center gap-1.5 text-xs">
                        <IconChat className="w-3.5 h-3.5" />
                        <span>Debate</span>
                    </span>
                ),
            },
            {
                value: 'summarize',
                label: (
                    <span className="flex items-center gap-1.5 text-xs">
                        <IconBook className="w-3.5 h-3.5" />
                        <span>Summarize</span>
                    </span>
                ),
            },
        ],
    },
]

const MODE_PREFIX: Record<string, string> = {
    write: 'Write a clear notebook section about:',
    research: 'Research this topic and write structured notes with headings:',
    debate: 'Lay out the strongest arguments and counter-arguments for:',
    summarize: 'Summarize this as concise notebook notes:',
}

export function NotebookAIWriterModal({
    isOpen,
    onClose,
    onInsertContent,
}: NotebookAIWriterModalProps): JSX.Element | null {
    const [prompt, setPrompt] = useState('')
    const [mode, setMode] = useState('write')
    const [botId, setBotId] = useState(PHILOSOPHER_BOTS[0]?.id || 'nietzsche')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

    useEffect(() => {
        if (isOpen) {
            setError(null)
            setTimeout(() => textAreaRef.current?.focus(), 100)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleGenerate = async () => {
        const text = prompt.trim()
        if (!text || busy) return
        setBusy(true)
        setError(null)
        const question = `${MODE_PREFIX[mode] || MODE_PREFIX.write} ${text}`

        try {
            let res = await fetch('/api/bots/act', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    bot: botId,
                    question,
                    mood: mode === 'debate' ? 'fiery' : 'calm',
                    taskType: 'community_reply',
                    thinkingDepth: mode === 'research' ? 'extended' : 'standard',
                }),
            })

            if (res.status === 404 || res.status === 405) {
                res = await fetch('/api/philosopher-bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        philosopher: botId,
                        question,
                        mood: mode === 'debate' ? 'fiery' : 'calm',
                        taskType: 'community_reply',
                        thinkingDepth: mode === 'research' ? 'extended' : 'standard',
                    }),
                })
            }

            let data: { reply?: string; error?: string } | null = null
            try {
                data = await res.json()
            } catch {
                data = null
            }

            const reply =
                (typeof data?.reply === 'string' && data.reply.trim()) ||
                (typeof data?.error === 'string' && data.error) ||
                null

            if (!reply) {
                setError(res.ok ? 'No reply returned. Try again.' : `Request failed (${res.status}).`)
                return
            }

            onInsertContent(reply)
            setPrompt('')
            onClose()
        } catch {
            setError('The philosopher network is unreachable right now.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <LemonModal isOpen={isOpen} onClose={onClose} width={640}>
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[#1D4ED8] flex items-center justify-center text-white">
                            <IconSparkles className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm">Ask WIM</span>
                        <LemonTag type="highlight" size="small" className="text-[10px] px-1.5 py-0">
                            Inserts into notebook
                        </LemonTag>
                    </div>
                    <LemonSelect
                        value={botId}
                        onChange={(val) => setBotId(val || botId)}
                        options={PHILOSOPHER_BOTS.map((bot) => ({
                            value: bot.id,
                            label: bot.displayName,
                        }))}
                        size="xsmall"
                    />
                </div>

                <label
                    htmlFor="wim-ai-question-input"
                    className="input-like flex flex-col cursor-text border border-border focus-within:border-primary bg-[var(--color-bg-fill-input,var(--color-bg-surface-secondary,#ffffff))] rounded-xl p-3"
                >
                    <textarea
                        id="wim-ai-question-input"
                        ref={textAreaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="What should we write, research, or debate?"
                        rows={6}
                        disabled={busy}
                        className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none resize-none leading-relaxed min-h-[120px]"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault()
                                void handleGenerate()
                            }
                        }}
                    />

                    <div className="flex items-center justify-between pt-2 border-t border-border text-[11px]">
                        <LemonSelect
                            value={mode}
                            onChange={(val) => setMode(val || 'write')}
                            options={WRITER_MODES}
                            size="xsmall"
                            type="tertiary"
                            dropdownPlacement="top-start"
                            dropdownMatchSelectWidth={false}
                        />

                        <div className="flex items-center gap-2">
                            {error ? <span className="text-danger text-[11px] max-w-[16rem] truncate">{error}</span> : null}
                            <span className="text-muted text-[10px] hidden sm:inline font-mono">Ctrl + Enter</span>
                            <LemonButton
                                type="primary"
                                size="small"
                                icon={<IconArrowRight />}
                                onClick={() => void handleGenerate()}
                                disabled={!prompt.trim() || busy}
                                loading={busy}
                                tooltip="Insert a philosopher reply into the notebook"
                            >
                                {busy ? 'Thinking…' : 'Insert'}
                            </LemonButton>
                        </div>
                    </div>
                </label>
            </div>
        </LemonModal>
    )
}
