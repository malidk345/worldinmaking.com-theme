const BREAKPOINTS = {
    xs: 320,
    sm: 576,
    md: 768,
    lg: 1024,
    xl: 1280,
    xxl: 1536,
}

function getBreakpoints(width) {
    return {
        xs: width >= BREAKPOINTS.xs,
        sm: width >= BREAKPOINTS.sm,
        md: width >= BREAKPOINTS.md,
        lg: width >= BREAKPOINTS.lg,
        xl: width >= BREAKPOINTS.xl,
        xxl: width >= BREAKPOINTS.xxl,
    }
}

function areBreakpointsEqual(a, b) {
    return (
        a.xs === b.xs &&
        a.sm === b.sm &&
        a.md === b.md &&
        a.lg === b.lg &&
        a.xl === b.xl &&
        a.xxl === b.xxl
    );
}

const prev = getBreakpoints(1000);
const next = getBreakpoints(1001);

console.log(prev !== next); // true, different object references
console.log(areBreakpointsEqual(prev, next)); // true, semantic equality
