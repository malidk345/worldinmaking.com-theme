import React from 'react'

/**
 * Wallpapers — same scenes / colors as wimpos, without 3D / character overlays.
 *
 * Keep: gradients, photo BGs, carpet tiles (the wallpaper itself).
 * Drop: hedge, hogzilla figure, office prop art, etc. stacked on top.
 *
 * Visibility: body[data-wallpaper] (theme-init / App.tsx).
 */

const FADE_OPACITY = 'transition-opacity duration-700 ease-in-out'

/** wimpos Hogzilla base — no hogzilla PNG overlay */
const Hogzilla = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#B4ADC4_0%,#9E97AE_52%,#8B839C_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#141E40_0%,#46368B_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
    </>
)

const mulberry32 = (seed: number) => {
    let s = seed | 0
    return () => {
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14) >>> 0) / 4294967296)
    }
}
