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

function areBreakpointsEqual(a: Breakpoints, b: Breakpoints): boolean {
    return (
        a.xs === b.xs &&
        a.sm === b.sm &&
        a.md === b.md &&
        a.lg === b.lg &&
        a.xl === b.xl &&
        a.xxl === b.xxl
    )
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
                return areBreakpointsEqual(prev, next) ? prev : next
            })
        }
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    return breakpoints
}

export default useBreakpoint
