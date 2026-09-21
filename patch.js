const fs = require('fs')

const code = fs.readFileSync('src/hooks/useBreakpoint.ts', 'utf8')
const newCode = code.replace(
    /const update = \(\) => setBreakpoints\(prev => \{/,
    `// ⚡ Bolt: Prevent unnecessary re-renders on resize by checking if breakpoints actually changed, and return the same object reference to bail out of React rendering. Also using passive listener for better scroll/resize performance.\n        const update = () => setBreakpoints(prev => {`
)

fs.writeFileSync('src/hooks/useBreakpoint.ts', newCode)
