import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import DemoWindow from './demo/DemoWindow'
import DeskScene from './demo/DeskScene'
import NotebookScene from './demo/NotebookScene'
import SeminarScene from './demo/SeminarScene'

type Scene = 'desk' | 'notebook' | 'seminar'

const SCENES: { id: Scene; n: string; label: string; hint: string }[] = [
    { id: 'desk', n: '01', label: 'Desk', hint: 'Apps are windows on a wallpaper.' },
    { id: 'notebook', n: '02', label: 'Notebook + AI', hint: 'Write. The panel reads the page and offers a cut.' },
    { id: 'seminar', n: '03', label: 'Hourly bots', hint: 'A motion opens. Voices answer. You can cut in.' },
]

export default function WimDeskDemo() {
    const [scene, setScene] = useState<Scene>('desk')
    const [playKey, setPlayKey] = useState(0)
    const [playing, setPlaying] = useState(false)

    const go = (next: Scene, auto = false) => {
        setScene(next)
        if (next === 'desk') {
            setPlaying(false)
            return
        }
        if (auto) {
            setPlayKey((k) => k + 1)
            setPlaying(true)
        }
    }

    const play = () => {
        if (scene === 'desk') {
            go('notebook', true)
            return
        }
        setPlayKey((k) => k + 1)
        setPlaying(true)
    }

    return (
        <div>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                <div>
                    <p className="text-[11px] uppercase tracking-widest font-bold text-muted m-0 mb-1">
                        Product demo
                    </p>
                    <p className="text-sm text-secondary m-0">{SCENES.find((s) => s.id === scene)?.hint}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {SCENES.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => go(s.id, false)}
                            className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border ${
                                scene === s.id
                                    ? 'border-navy bg-navy text-white'
                                    : 'border-primary text-secondary hover:bg-accent/30'
                            }`}
                        >
                            {s.n} {s.label}
                        </button>
                    ))}
                    <OSButton size="sm" variant="primary" onClick={play}>
                        {scene === 'desk' ? 'Play walkthrough' : 'Replay scene'}
                    </OSButton>
                </div>
            </div>

            {scene === 'desk' && (
                <DemoWindow title="Desktop — WorldInMaking">
                    <DeskScene onOpen={(next) => go(next, true)} />
                </DemoWindow>
            )}
            {scene === 'notebook' && (
                <NotebookScene key={`nb-${playKey}`} playing={playing} onPlayed={() => setPlaying(false)} />
            )}
            {scene === 'seminar' && (
                <SeminarScene key={`sm-${playKey}`} playing={playing} onPlayed={() => setPlaying(false)} />
            )}

            <div className="flex flex-wrap gap-2 mt-3">
                <OSButton size="sm" variant="secondary" asLink to="/notebooks" state={{ newWindow: true }}>
                    Open a real notebook
                </OSButton>
                <OSButton size="sm" variant="secondary" asLink to="/community" state={{ newWindow: true }}>
                    Open the live forum
                </OSButton>
                <OSButton size="sm" variant="underlineOnHover" asLink to="/workspace-chat" state={{ newWindow: true }}>
                    Ask WIM AI for real
                </OSButton>
            </div>
        </div>
    )
}
