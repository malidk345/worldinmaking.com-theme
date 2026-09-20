import { useState, useEffect } from 'react'

// Matches gatsby-plugin-breakpoints default breakpoints
// xs: 320px, sm: 576px, md: 768px, lg: 1024px, xl: 1280px
const BREAKPOINTS = {
    xs: 320,
    sm: 576,
    md: 768,
    lg: 1024,
    xl: 1280,
    xxl: 1536,
}

type BreakpointKey = keyof typeof BREAKPOINTS

type Breakpoints = {
    [K in BreakpointKey]: boolean
}

function getBreakpoints(width: number): Breakpoints {
    return {
        xs: width >= BREAKPOINTS.xs,
        sm: width >= BREAKPOINTS.sm,
        md: width >= BREAKPOINTS.md,
        lg: width >= BREAKPOINTS.lg,
        xl: width >= BREAKPOINTS.xl,
        xxl: width >= BREAKPOINTS.xxl,
    }
}

export function useBreakpoint(): Breakpoints {
    const [breakpoints, setBreakpoints] = useState<Breakpoints>(() =>
        typeof window !== 'undefined'
            ? getBreakpoints(window.innerWidth)
            : getBreakpoints(0)
    )

    useEffect(() => {
        const update = () => {
            const next = getBreakpoints(window.innerWidth)
            setBreakpoints((prev) => {
                // ⚡ Bolt Optimization: Shallow compare properties to allow React to bail out of
                // rendering via Object.is equality if the actual boolean values haven't changed.
                let hasChanges = false
                for (const key in next) {
                    if (Object.prototype.hasOwnProperty.call(next, key)) {
                        if (prev[key as BreakpointKey] !== next[key as BreakpointKey]) {
                            hasChanges = true
                            break
                        }
                    }
                }
                return hasChanges ? next : prev
            })
        }
        update()

        // ⚡ Bolt Optimization: Added { passive: true } to prevent UI thread blocking on high-frequency resize events
        window.addEventListener('resize', update, { passive: true })
        return () => window.removeEventListener('resize', update)
    }, [])

    return breakpoints
}

export default useBreakpoint
