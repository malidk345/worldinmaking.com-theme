import React from 'react'

interface WimLogoProps {
    className?: string
}

/**
 * WorldInMaking (WIM) Logomark
 * Concept: "The Evolving Globe / World in Making"
 * A minimalist, geometric black icon mark combining the globe/world sphere with wireframe making arcs.
 */
export function WimLogo({ className = 'size-5' }: WimLogoProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-label="WorldInMaking Logo"
        >
            {/* Outer Globe Circle */}
            <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.75" />
            {/* Latitude Line */}
            <path d="M2.75 12H21.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            {/* Longitude Wireframe Arcs (Making Grid) */}
            <path
                d="M7 5.5C9.2 7.8 9.2 16.2 7 18.5M17 5.5C14.8 7.8 14.8 16.2 17 18.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            {/* Center Making Node / Spark */}
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
    )
}

export default WimLogo
