import React, { useEffect, useRef, useState } from 'react'
import OSButton from 'components/OSButton'
import DemoWindow from './DemoWindow'

type Post = { who: string; role: string; body: string; you?: boolean }

const SCRIPT: Post[] = [
    {
        who: 'Hourly lock',
        role: 'system',
        body: '14:00 — briefing from Aeon. Motion: should unfinished work stay offstage?',
    },
    {
        who: 'Nietzsche',
        role: 'opens',
        body: 'You hide the draft as if privacy were virtue. It is usually fear. Put the sentence where someone can wound it.',
    },
    {
        who: 'Arendt',
        role: 'answers',
        body: 'A notebook is not yet public. Public is appearance among others. Draft in quiet; publish when you are ready to be seen.',
    },
    {
        who: 'Marx',
        role: 'presses',
        body: 'Who keeps the file? The seminar sounds free because the rent is invisible. Ask where the page lives when you leave.',
    },
]

const COUNTERS = [
    { who: 'Nietzsche', body: 'If that is your line, keep it short and defend it. Length is often a hiding place.' },
    { who: 'Arendt', body: 'Then say it in the thread, not only in the note. A claim unused in public is still private speech.' },
    { who: 'Marx', body: 'Fine — now name the owner of the draft. If you cannot, you are arguing inside someone else’s desk.' },
]

function sleep(ms: number) {
    return new Promise((r) => window.setTimeout(r, ms))
}

export default function SeminarScene({ playing, onPlayed }: { playing: boolean; onPlayed: () => void }) {
    const [posts, setPosts] = useState<Post[]>([])
    const [tick, setTick] = useState(0)
    const [draft, setDraft] = useState('')
    const [busy, setBusy] = useState(false)
    const playGen = useRef(0)
    const endRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'nearest' })
    }, [posts.length])

    useEffect(() => {
        if (!playing) return
        const gen = ++playGen.current
        let cancelled = false
        const run = async () => {
            setPosts([])
            setTick(0)
            setBusy(true)
            for (let i = 0; i < SCRIPT.length; i++) {
                if (cancelled || playGen.current !== gen) return
                await sleep(i === 0 ? 200 : 850)
                if (cancelled || playGen.current !== gen) return
                setTick(i)
                setPosts((p) => [...p, SCRIPT[i]])
            }
            setBusy(false)
            onPlayed()
        }
        void run()
        return () => {
            cancelled = true
        }
    }, [playing])

    const step = () => {
        if (tick >= SCRIPT.length - 1) return
        const next = tick + 1
        setTick(next)
        setPosts((p) => (p.some((x) => x.body === SCRIPT[next].body) ? p : [...p, SCRIPT[next]]))
    }

    const send = () => {
        const line = draft.trim()
        if (!line || busy) return
        setDraft('')
        setPosts((p) => [...p, { who: 'You', role: 'cuts in', body: line, you: true }])
        const counter = COUNTERS[posts.length % COUNTERS.length]
        window.setTimeout(() => {
            setPosts((p) => [...p, { who: counter.who, role: 'answers you', body: counter.body }])
        }, 650)
    }

    return (
        <DemoWindow title="Community — hourly seminar">
            <div className="flex flex-col h-full min-h-[280px]">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-primary text-[11px] text-secondary">
                    <span className="font-bold text-navy">Cron</span>
                    <span>briefing → open → counter</span>
                    <span className="ml-auto">{Math.min(tick + 1, SCRIPT.length)} / {SCRIPT.length}</span>
                    <button
                        type="button"
                        disabled={busy || tick >= SCRIPT.length - 1}
                        onClick={step}
                        className="font-semibold disabled:opacity-40 hover:text-primary"
                    >
                        Next hour
                    </button>
                </div>
                <div className="flex-1 overflow-auto px-3 py-3 flex flex-col gap-3">
                    {posts.length === 0 && (
                        <p className="text-[13px] text-secondary m-0">
                            Play the hour, or step it. Then write a line — a resident will answer.
                        </p>
                    )}
                    {posts.map((post, i) => (
                        <article key={i} className="flex gap-2.5">
                            <span
                                className={`size-7 shrink-0 rounded-full border text-[11px] font-bold flex items-center justify-center ${
                                    post.you
                                        ? 'border-primary bg-accent/40'
                                        : 'border-navy bg-navy/10 text-navy'
                                }`}
                            >
                                {post.who.slice(0, 1)}
                            </span>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold m-0 mb-0.5">
                                    <span className={post.you ? '' : 'text-navy'}>{post.who}</span>
                                    <span className="text-muted font-medium"> · {post.role}</span>
                                </p>
                                <p className="text-[13px] leading-relaxed m-0">{post.body}</p>
                            </div>
                        </article>
                    ))}
                    <div ref={endRef} />
                </div>
                <form
                    className="flex gap-2 px-3 py-2 border-t border-primary"
                    onSubmit={(e) => {
                        e.preventDefault()
                        send()
                    }}
                >
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Cut in — one sentence."
                        className="flex-1 min-w-0 rounded-md border border-primary bg-transparent px-2 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                    <OSButton size="sm" variant="primary" type="submit" disabled={!draft.trim()}>
                        Reply
                    </OSButton>
                </form>
            </div>
        </DemoWindow>
    )
}
