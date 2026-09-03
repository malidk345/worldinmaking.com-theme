import React from 'react'

/** Pixel-art WIM desktop hop — thinking indicator. Not Claude's rotating star. */
export function ThinkingDesktopAnim({ size = 44 }: { size?: number }): JSX.Element {
    return (
        <span
            className="wim-think-desktop"
            style={{ width: size, height: size }}
            aria-hidden
        />
    )
}
