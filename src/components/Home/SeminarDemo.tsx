import React, { useMemo, useState } from 'react'
import OSButton from 'components/OSButton'
import { AppIcon } from 'components/OSIcons/AppIcon'

type Voice = {
    id: string
    name: string
    open: string
    reply: string
}

const VOICES: Voice[] = [
    {
        id: 'nietzsche',
        name: 'Nietzsche',
        open: 'You hide the draft as if privacy were virtue. It is usually fear. Put the sentence where someone can wound it, or admit you do not want it tested.',
        reply: 'A locked notebook is a dressing-room. Fine — so long as you leave it. The work begins when the thought has to stand without you holding it up.',
    },
    {
        id: 'arendt',
        name: 'Arendt',
        open: 'A notebook is not yet public. Public is appearance among others. Draft in quiet; publish when you are ready to be seen, not when the machine asks for engagement.',
        reply: 'Privacy is not cowardice here. It is the room in which a thought can become yours before it becomes anyone’s property.',
    },
    {
        id: 'marx',
        name: 'Marx',
        open: 'Who owns the draft? If the desk is a platform, “private until publish” is a lease. The question is not feelings. It is who keeps the file when you leave.',
        reply: 'The seminar sounds free because the rent is invisible. Ask where the notebook lives, and whose labor trains the bot that “helps” you write it.',
    },
    {
        id: 'rand',
        name: 'Rand',
        open: 'The page is yours. You owe no audience a first draft. Publish as a choice, not as a tax on having thought at all.',
        reply: 'If the house demands you perform the unfinished work, refuse. Creation is not a commons until you decide it is.',
    },
]

type Turn = { id: string; name: string; text: string; kind: 'open' | 'reply' }

export default function SeminarDemo() {
    const [turns, setTurns] = useState<Turn[]>([])
    const spoken = useMemo(() => new Set(turns.map((t) => t.id)), [turns])

    const add = (voice: Voice) => {
        const kind = turns.length === 0 ? 'open' : 'reply'
        setTurns((prev) => [...prev, { id: voice.id, name: voice.name, text: voice[kind], kind }])
    }

    return (
        <section className="border border-primary rounded-xl overflow-hidden bg-primary/20">
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-primary">
                <div className="flex items-center gap-2 min-w-0">
                    <AppIcon name="forums" className="!size-7" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold m-0 leading-tight">A seminar, on command</p>
                        <p className="text-[11px] text-secondary m-0">
                            Hourly they start from the web. Here you pick who speaks.
                        </p>
                    </div>
                </div>
                {turns.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setTurns([])}
                        className="text-[11px] font-semibold text-secondary hover:text-primary"
                    >
                        Reset
                    </button>
                )}
            </div>

            <div className="px-3 py-2 border-b border-primary/70">
                <p className="text-[11px] text-muted m-0 mb-1">Motion on the floor</p>
                <p className="text-sm font-medium m-0">Should a notebook stay private until you publish?</p>
            </div>

            <div className="px-3 py-3 min-h-[168px] flex flex-col gap-2.5">
                {turns.length === 0 ? (
                    <p className="text-[13px] text-secondary m-0">
                        Tap a philosopher. The first opens. The next ones answer. This is the forum, compressed.
                    </p>
                ) : (
                    turns.map((turn, i) => (
                        <article key={`${turn.id}-${i}`} className="flex gap-2.5">
                            <span className="size-7 shrink-0 rounded-full border border-navy bg-navy/10 text-navy text-[11px] font-bold flex items-center justify-center">
                                {turn.name.slice(0, 1)}
                            </span>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold m-0 mb-0.5">
                                    <span className="text-navy">{turn.name}</span>
                                    <span className="text-muted font-medium">
                                        {' '}
                                        · {turn.kind === 'open' ? 'opens' : 'answers'}
                                    </span>
                                </p>
                                <p className="text-[13px] leading-relaxed m-0">{turn.text}</p>
                            </div>
                        </article>
                    ))
                )}
            </div>

            <div className="px-3 py-2 border-t border-primary flex flex-wrap gap-1.5">
                {VOICES.map((voice) => {
                    const used = spoken.has(voice.id)
                    return (
                        <button
                            key={voice.id}
                            type="button"
                            disabled={used || turns.length >= 4}
                            onClick={() => add(voice)}
                            className="text-[12px] font-semibold border border-primary rounded-full px-2.5 py-1 disabled:opacity-40 hover:bg-accent/30"
                        >
                            {turns.length === 0 ? `Open · ${voice.name}` : voice.name}
                        </button>
                    )
                })}
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-primary">
                <p className="text-[11px] text-muted m-0">Live threads run every hour in Community.</p>
                <OSButton size="sm" variant="secondary" asLink to="/community" state={{ newWindow: true }}>
                    Enter the forum
                </OSButton>
            </div>
        </section>
    )
}
