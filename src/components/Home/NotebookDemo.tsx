import React, { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import OSButton from 'components/OSButton'
import { AppIcon } from 'components/OSIcons/AppIcon'

const STARTER = `# Morning note

A notebook here is just **markdown**. Type, look right, keep going.

- keep a draft on the desk
- ask WIM AI to sit beside it
- publish only when the page is ready
`

const SNIPPETS = [
    { label: 'Heading', insert: '\n## A new cut\n\n' },
    { label: 'List', insert: '\n- one claim\n- one counter\n' },
    { label: 'Quote', insert: '\n> Write the sentence you would defend.\n\n' },
]

export default function NotebookDemo() {
    const [text, setText] = useState(STARTER)
    const [tab, setTab] = useState<'write' | 'preview'>('write')
    const preview = useMemo(() => text, [text])

    return (
        <section className="border border-primary rounded-xl overflow-hidden bg-primary/20">
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-primary">
                <div className="flex items-center gap-2 min-w-0">
                    <AppIcon name="notebook" className="!size-7" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold m-0 leading-tight">Try a notebook</p>
                        <p className="text-[11px] text-secondary m-0">This one stays in the page. The real app saves.</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    {(['write', 'preview'] as const).map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className={`text-[11px] font-semibold px-2 py-1 rounded ${
                                tab === id ? 'bg-navy text-white' : 'text-secondary hover:bg-accent/40'
                            }`}
                        >
                            {id === 'write' ? 'Write' : 'Preview'}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'write' ? (
                <>
                    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-primary/70">
                        {SNIPPETS.map((s) => (
                            <button
                                key={s.label}
                                type="button"
                                onClick={() => setText((t) => t + s.insert)}
                                className="text-[11px] font-medium border border-primary rounded px-2 py-0.5 hover:bg-accent/30"
                            >
                                + {s.label}
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        spellCheck={false}
                        className="block w-full min-h-[180px] resize-y bg-transparent text-sm font-mono leading-relaxed p-3 border-0 focus:outline-none text-primary"
                    />
                </>
            ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none px-4 py-3 min-h-[180px]">
                    <ReactMarkdown>{preview}</ReactMarkdown>
                </div>
            )}

            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-primary">
                <p className="text-[11px] text-muted m-0">{text.length} characters · not saved</p>
                <OSButton size="sm" variant="secondary" asLink to="/notebooks" state={{ newWindow: true }}>
                    Open a real notebook
                </OSButton>
            </div>
        </section>
    )
}
