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
            // Bolt Performance Optimization:
            // Calculate new breakpoints based on current window width.
            const next = getBreakpoints(window.innerWidth)

            // Use functional state update to compare previous breakpoints with the newly calculated ones.
            // If they are exactly the same across all breakpoint keys, return the 'prev' reference.
            // React's Object.is() equality check on state updates will bail out of rendering entirely
            // when the reference hasn't changed. This is critical for high-frequency events like 'resize',
            // as it prevents an avalanche of unnecessary React renders for components relying on this hook
            // when the width changes but the active breakpoints stay identical.
            setBreakpoints((prev) => {
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

        // Bolt Performance Optimization:
        // Mark the 'resize' event listener as 'passive: true'.
        // Since we never call preventDefault() here, this tells the browser it doesn't need to block
        // the main UI thread (e.g. scrolling/resizing layout calculation) waiting for this JS execution.
        window.addEventListener('resize', update, { passive: true })
        return () => window.removeEventListener('resize', update)
    }, [])

    return breakpoints
}

export default useBreakpoint
