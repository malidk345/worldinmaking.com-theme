import React, { useEffect, useMemo, useState } from 'react'
import lookIcon from '../../../images/icons/pause-eyes/look.png'
import leftIcon from '../../../images/icons/pause-eyes/left.png'
import rightIcon from '../../../images/icons/pause-eyes/right.png'
import upIcon from '../../../images/icons/pause-eyes/up.png'
import blinkIcon from '../../../images/icons/pause-eyes/blink.png'
import readIcon from '../../../images/icons/pause-eyes/read.png'
import focusIcon from '../../../images/icons/pause-eyes/focus.png'
import wonderIcon from '../../../images/icons/pause-eyes/wonder.png'
import searchIcon from '../../../images/icons/pause-eyes/search.png'
import peekIcon from '../../../images/icons/pause-eyes/peek.png'

const importedSrc = (mod: unknown): string => {
    if (typeof mod === 'string') return mod
    if (mod && typeof mod === 'object' && 'src' in mod) {
        const src = (mod as { src?: unknown }).src
        if (typeof src === 'string') return src
    }
    return ''
}

export type PauseMood = 'think' | 'search' | 'read' | 'focus' | 'wonder'

const ICONS = {
    look: importedSrc(lookIcon) || '/icons/pause-eyes/look.png',
    left: importedSrc(leftIcon) || '/icons/pause-eyes/left.png',
    right: importedSrc(rightIcon) || '/icons/pause-eyes/right.png',
    up: importedSrc(upIcon) || '/icons/pause-eyes/up.png',
    blink: importedSrc(blinkIcon) || '/icons/pause-eyes/blink.png',
    read: importedSrc(readIcon) || '/icons/pause-eyes/read.png',
    focus: importedSrc(focusIcon) || '/icons/pause-eyes/focus.png',
    wonder: importedSrc(wonderIcon) || '/icons/pause-eyes/wonder.png',
    search: importedSrc(searchIcon) || '/icons/pause-eyes/search.png',
    peek: importedSrc(peekIcon) || '/icons/pause-eyes/peek.png',
}

/** First version — do not drop or reorder these beats. */
const ORIGINAL: Array<keyof typeof ICONS> = [
    'look',
    'look',
    'left',
    'left',
    'look',
    'right',
    'right',
    'look',
    'blink',
    'look',
    'up',
    'look',
]

const EXPRESSIONS: Array<keyof typeof ICONS> = ['read', 'look', 'focus', 'look', 'wonder', 'look']

const TOOL_THINKING: Array<keyof typeof ICONS> = ['search', 'search', 'look', 'peek', 'look', 'read', 'look', 'focus', 'look']

const TOOL_BEAT: Record<PauseMood, keyof typeof ICONS> = {
    think: 'look',
    search: 'search',
    read: 'read',
    focus: 'focus',
    wonder: 'wonder',
}

function sequenceFor(mood: PauseMood): Array<keyof typeof ICONS> {
    const extra = mood === 'think' ? [] : [TOOL_BEAT[mood], TOOL_BEAT[mood], 'look']
    return [...ORIGINAL, ...EXPRESSIONS, ...TOOL_THINKING, ...extra]
}

export function pauseMoodFromTool(name?: string, status?: string): PauseMood {
    if (status === 'error') return 'wonder'
    const tool = String(name || '')
    if (
        tool === 'web_search' ||
        tool === 'search_site' ||
        tool === 'fetch_url' ||
        tool === 'search_academic_corpus' ||
        tool === 'verified_corpus_search' ||
        tool === 'academic_search'
    ) {
        return 'search'
    }
    if (
        tool === 'read_document' ||
        tool === 'read_notebook' ||
        tool === 'read_post' ||
        tool === 'add_notebook_footnote'
    ) {
        return 'read'
    }
    if (
        tool === 'create_artifact' ||
        tool === 'create_concept_map' ||
        tool === 'run_code_sandbox' ||
        tool === 'insert_notebook_block' ||
        tool === 'rewrite_notebook_document'
    ) {
        return 'focus'
    }
    return 'think'
}

/** Pause-button face: bars as eyes that glance and blink. Click stops the stream. */
export function PixelPause({
    live = true,
    mood = 'think',
    onStop,
}: {
    live?: boolean
    mood?: PauseMood
    onStop?: () => void
}): JSX.Element {
    const [frame, setFrame] = useState(0)
    const sequence = useMemo(() => sequenceFor(mood), [mood])

    useEffect(() => {
        if (!live || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setFrame(0)
            return
        }
        const timer = window.setInterval(() => {
            setFrame((index) => (index + 1) % sequence.length)
        }, 280)
        return () => window.clearInterval(timer)
    }, [live, sequence])

    const icon = (
        <span className={`wim-pixel-pause${live ? ' is-live' : ''}`} aria-hidden>
            <img
                className="wim-pixel-pause-face"
                src={ICONS[sequence[frame]] || ICONS.look}
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
