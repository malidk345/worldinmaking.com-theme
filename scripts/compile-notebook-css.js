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

    // Allow portal selectors (like .Popover, .LemonModal, .LemonPopover, .LemonMenu) to match when
    // 'notebook-app-scope' is placed directly on the portal element itself
    cssContent = cssContent.replace(
        /\.notebook-app-scope\s+(\.(?:Popover|LemonModal|LemonPopover|LemonMenu|ReactModal|Tooltip)[^\s,\{\:]*)/g,
        '.notebook-app-scope $1, $1.notebook-app-scope'
    )

    const tsContent = `// Auto-generated notebook CSS string\nexport const NOTEBOOK_APP_CSS = ${JSON.stringify(cssContent)};\n`
    fs.writeFileSync(bundleTsPath, tsContent)
    console.log('Successfully compiled bundle.scss to bundleCss.ts (length:', cssContent.length, ')')
} catch (e) {
    console.error('Error compiling notebook CSS:', e)
    process.exit(1)
}
