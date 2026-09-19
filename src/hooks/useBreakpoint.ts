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
        const update = () => setBreakpoints(prev => {
            const next = getBreakpoints(window.innerWidth)
            // Shallow compare to bail out of React rendering if bounds didn't change
            // This is a high-frequency event, returning the prev reference avoids GC churn
            let hasChanged = false
            for (const key in next) {
                if (Object.prototype.hasOwnProperty.call(next, key)) {
                    if (prev[key as BreakpointKey] !== next[key as BreakpointKey]) {
                        hasChanged = true
                        break
                    }
                }
            }
            return hasChanged ? next : prev
        })
        update()
        window.addEventListener('resize', update, { passive: true })
        return () => window.removeEventListener('resize', update)
    }, [])

    return breakpoints
}

export default useBreakpoint
