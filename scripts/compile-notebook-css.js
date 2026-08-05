/**
 * Compiles bundle.scss into bundleCss.ts exporting NOTEBOOK_APP_CSS string.
 * Unbinds invalid nested :root / :host selectors so CSS variables bind directly to .notebook-app-scope.
 * Also allows portal classes (.Popover, .LemonModal, etc.) to match when 'notebook-app-scope' is on the same element.
 */
const fs = require('fs')
const path = require('path')
const sass = require('sass')

const bundleScssPath = path.resolve(__dirname, '../src/notebook-app/styles/bundle.scss')
const bundleTsPath = path.resolve(__dirname, '../src/notebook-app/styles/bundleCss.ts')

try {
    const result = sass.compile(bundleScssPath, { style: 'expanded' })
    let cssContent = result.css.toString()

    // Fix invalid nested :root and :host selectors so CSS variables bind directly to .notebook-app-scope
    cssContent = cssContent.replace(/\.notebook-app-scope\s+(?::root|:host)/g, '.notebook-app-scope')

    // Allow portal selectors (Popover/Modal/Tooltip/…) to match when `notebook-app-scope`
    // is on the portal root itself (FloatingPortal mounts under body).
    //
    // Example:
    //   .notebook-app-scope .Popover.Popover--enter-active > .Popover__box
    // becomes
    //   .notebook-app-scope .Popover.Popover--enter-active > .Popover__box,
    //   .Popover.Popover--enter-active.notebook-app-scope > .Popover__box
    //
    // Only the first compound (classes + attrs) gets `.notebook-app-scope` dual-form;
    // the rest of the combinator chain is preserved intact.
    // Match whole BEM roots only — do NOT partially match `.Popover__arrow` as `.Popover`.
    const PORTAL_ROOT =
        String.raw`\.(?:Popover|LemonModal|LemonPopover|LemonMenu|ReactModal|Tooltip|notebook-dark-panel)(?:--[\w-]+)?(?![A-Za-z0-9_])`
    const COMPOUND = String.raw`${PORTAL_ROOT}(?:\.[^\s,>+~{\[:]+)*(?:\[[^\]]*\])*`
    const CHAIN_TAIL = String.raw`(?:\s*[>+~\s]\s*[^\s,{]+)*`
    const portalRewrite = new RegExp(
        String.raw`\.notebook-app-scope\s+(${COMPOUND}${CHAIN_TAIL})`,
        'g'
    )
    cssContent = cssContent.replace(portalRewrite, (match, rest) => {
        const m = rest.match(/^(\.[^\s,>+~{]+)([\s\S]*)$/)
        if (!m) return match
        const first = m[1]
        const tail = m[2] || ''
        // Avoid double-rewriting already dual selectors
        if (first.includes('notebook-app-scope')) return match
        return `.notebook-app-scope ${first}${tail}, ${first}.notebook-app-scope${tail}`
    })

    const tsContent = `// Auto-generated notebook CSS string\nexport const NOTEBOOK_APP_CSS = ${JSON.stringify(cssContent)};\n`
    fs.writeFileSync(bundleTsPath, tsContent)
    console.log('Successfully compiled bundle.scss to bundleCss.ts (length:', cssContent.length, ')')
} catch (e) {
    console.error('Error compiling notebook CSS:', e)
    process.exit(1)
}
