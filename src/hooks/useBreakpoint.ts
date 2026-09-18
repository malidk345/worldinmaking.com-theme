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
            setBreakpoints((prev) => {
                const next = getBreakpoints(window.innerWidth)
                // ⚡ Bolt Optimization: Shallow compare properties. If unchanged, return the prev
                // reference to allow React to bail out of unnecessary re-renders during rapid resize events.
                if (
                    prev.xs === next.xs &&
                    prev.sm === next.sm &&
                    prev.md === next.md &&
                    prev.lg === next.lg &&
                    prev.xl === next.xl &&
                    prev.xxl === next.xxl
                ) {
                    return prev
                }
                return next
            })
        }
        update()
        // ⚡ Bolt Optimization: Added { passive: true } to prevent UI thread blocking
        window.addEventListener('resize', update, { passive: true })
        return () => window.removeEventListener('resize', update)
    }, [])

    return breakpoints
}

export default useBreakpoint
