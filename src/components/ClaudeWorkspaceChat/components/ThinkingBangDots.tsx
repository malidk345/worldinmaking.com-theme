import React, { useEffect, useState } from 'react'
import lookIcon from '../../../images/icons/pause-eyes/look.png'
import leftIcon from '../../../images/icons/pause-eyes/left.png'
import rightIcon from '../../../images/icons/pause-eyes/right.png'
import upIcon from '../../../images/icons/pause-eyes/up.png'
import blinkIcon from '../../../images/icons/pause-eyes/blink.png'

const importedSrc = (mod: unknown): string => {
    if (typeof mod === 'string') return mod
    if (mod && typeof mod === 'object' && 'src' in mod) {
        const src = (mod as { src?: unknown }).src
        if (typeof src === 'string') return src
    }
    return ''
}

const FRAMES = [
    importedSrc(lookIcon) || '/icons/pause-eyes/look.png',
    importedSrc(leftIcon) || '/icons/pause-eyes/left.png',
    importedSrc(rightIcon) || '/icons/pause-eyes/right.png',
    importedSrc(upIcon) || '/icons/pause-eyes/up.png',
    importedSrc(blinkIcon) || '/icons/pause-eyes/blink.png',
]

const SEQUENCE = [0, 0, 1, 1, 0, 2, 2, 0, 4, 0, 3, 0]

/** Pause-button face: bars as eyes that glance and blink. Click stops the stream. */
export function PixelPause({
    live = true,
    onStop,
}: {
    live?: boolean
    onStop?: () => void
}): JSX.Element {
    const [frame, setFrame] = useState(0)

    useEffect(() => {
        if (!live || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setFrame(0)
            return
        }
        const timer = window.setInterval(() => {
            setFrame((index) => (index + 1) % SEQUENCE.length)
        }, 280)
        return () => window.clearInterval(timer)
    }, [live])

    const icon = (
        <span className={`wim-pixel-pause${live ? ' is-live' : ''}`} aria-hidden>
            <img
                className="wim-pixel-pause-face"
                src={FRAMES[SEQUENCE[frame]] || FRAMES[0]}
                alt=""
                width={22}
                height={22}
                draggable={false}
            />
        </span>
    )

    if (!onStop) return icon

    return (
        <button
            type="button"
            className="wim-pixel-pause-btn"
            onClick={(event) => {
                event.stopPropagation()
                onStop()
            }}
            title="Stop generating"
            aria-label="Stop generating"
        >
            {icon}
        </button>
    )
}

export function ThinkingKnot({ live = true }: { live?: boolean }): JSX.Element {
    return <PixelPause live={live} />
}

export function ThinkingSparkle({ live = true }: { live?: boolean }): JSX.Element {
    return <PixelPause live={live} />
}

export function ThinkingWeb({ live = true }: { live?: boolean }): JSX.Element {
    return <PixelPause live={live} />
}

export function ThinkingBangDots(): JSX.Element {
    return <PixelPause live />
}
