import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import OSButton from 'components/OSButton'
import DemoWindow from './DemoWindow'

const DRAFT = `# On unfinished pages

I keep the note closed because I am not sure it is true yet.

The temptation is to wait for a finished voice. The risk is that the voice never has to meet anyone.`

const AI_INSERT = `

## What the desk would add

A notebook here is not a post. It can stay closed. When you want a reader, you publish — or you let WIM AI sit in the next window and press on the weak sentence, not rewrite the whole page in a house style.`

const SUGGESTIONS = [
    'Press the last sentence: what would have to be true for this fear to be wrong?',
    'Turn the second paragraph into a claim you could defend in the forum.',
    'Add a one-line note to yourself: who is allowed to see this draft?',
]

function sleep(ms: number) {
    return new Promise((r) => window.setTimeout(r, ms))
}

export default function NotebookScene({ playing, onPlayed }: { playing: boolean; onPlayed: () => void }) {
    const [text, setText] = useState('')
    const [tab, setTab] = useState<'write' | 'preview'>('write')
    const [aiStatus, setAiStatus] = useState('Idle — watches the open page.')
    const [offer, setOffer] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const playGen = useRef(0)

    const typeInto = async (full: string, gen: number) => {
        setText('')
        for (let i = 1; i <= full.length; i++) {
            if (playGen.current !== gen) return
            setText(full.slice(0, i))
            await sleep(i % 7 === 0 ? 28 : 12)
        }
    }

    useEffect(() => {
        if (!playing) return
        const gen = ++playGen.current
        let cancelled = false
        const run = async () => {
            setBusy(true)
            setOffer(null)
            setTab('write')
            setAiStatus('Bound to this notebook.')
            await typeInto(DRAFT, gen)
            if (cancelled || playGen.current !== gen) return
            setAiStatus('Reading the last paragraph…')
            await sleep(700)
            if (cancelled || playGen.current !== gen) return
            setAiStatus('A cut you can take or leave.')
            setOffer(AI_INSERT.trim())
            setBusy(false)
            onPlayed()
        }
        void run()
        return () => {
            cancelled = true
        }
    }, [playing])

    const accept = () => {
        if (!offer) return
        setText((t) => t + '\n\n' + offer)
        setOffer(null)
        setAiStatus('Inserted. The page is still yours.')
        setTab('preview')
    }

    const ask = () => {
        const next = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)]
        setAiStatus('On the open note.')
        setOffer(next)
    }

    return (
        <DemoWindow
            title="morning-note.md — Notebook"
            aside={
                <div className="h-full flex flex-col p-3">
                    <p className="text-[11px] uppercase tracking-widest font-bold text-muted m-0 mb-1">WIM AI</p>
                    <p className="text-[12px] text-secondary m-0 mb-3 leading-snug">{aiStatus}</p>
                    {offer ? (
                        <div className="flex-1 min-h-0 flex flex-col">
                            <div className="text-[13px] leading-relaxed border border-primary rounded-md p-2 bg-accent/20 flex-1 overflow-auto">
                                {offer}
                            </div>
                            <div className="flex gap-1.5 mt-2">
                                <OSButton size="sm" variant="primary" onClick={accept}>
                                    Insert
                                </OSButton>
                                <OSButton size="sm" variant="secondary" onClick={() => setOffer(null)}>
                                    Keep mine
                                </OSButton>
                            </div>
                        </div>
                    ) : (
                        <OSButton size="sm" variant="secondary" onClick={ask} disabled={busy || !text}>
                            Ask about this page
                        </OSButton>
                    )}
                    <p className="text-[11px] text-muted m-0 mt-auto pt-3">
                        In the real app the chat snaps beside the notebook and can edit blocks.
                    </p>
                </div>
            }
        >
            <div className="flex flex-col h-full min-h-[280px]">
                <div className="flex items-center gap-1 px-2 py-1 border-b border-primary">
                    {(['write', 'preview'] as const).map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                tab === id ? 'bg-navy text-white' : 'text-secondary hover:bg-accent/40'
                            }`}
                        >
                            {id === 'write' ? 'Write' : 'Preview'}
                        </button>
                    ))}
                    <span className="ml-auto text-[11px] text-muted">{text.length} chars · demo</span>
                </div>
                {tab === 'write' ? (
                    <textarea
                        value={text}
                        onChange={(e) => {
                            playGen.current += 1
                            setText(e.target.value)
                        }}
                        spellCheck={false}
                        placeholder="Write a sentence. Then ask the panel on the right."
                        className="flex-1 min-h-[220px] w-full resize-none bg-transparent text-[13px] font-mono leading-relaxed p-3 border-0 focus:outline-none text-primary"
                    />
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none px-4 py-3 flex-1 overflow-auto">
                        <ReactMarkdown>{text || '*Nothing on the page yet.*'}</ReactMarkdown>
                    </div>
                )}
            </div>
        </DemoWindow>
    )
}
