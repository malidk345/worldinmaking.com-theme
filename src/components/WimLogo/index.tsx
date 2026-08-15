import React from 'react'
import officialMark from '../../images/icons/bang-light-cut-classic.png'

interface WimLogoProps {
    className?: string
}

const importedSrc = (mod: unknown): string => {
    if (typeof mod === 'string') return mod
    if (mod && typeof mod === 'object' && 'src' in mod) {
        const src = (mod as { src?: unknown }).src
        if (typeof src === 'string') return src
    }
    return ''
}

/** Official WIM mark — faceted light-navy bang, white top. */
export function WimLogo({ className = 'size-5' }: WimLogoProps) {
    return (
        <img
            src={importedSrc(officialMark)}
            alt="WorldInMaking"
            draggable={false}
            className={className}
        />
    )
}

export default WimLogo
