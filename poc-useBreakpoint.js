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

// In the hook:
// const update = () => {
//     setBreakpoints(prev => {
//         const next = getBreakpoints(window.innerWidth);
//         return areBreakpointsEqual(prev, next) ? prev : next;
//     });
// };
