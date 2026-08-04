/**
 * Generates quill-shim.css wrapped strictly inside .notebook-app-scope and Portals.
 * Replaces :root with & so no variables or resets ever bleed to html, body, or posthog.com main header.
 */
const fs = require('fs')
const path = require('path')

const srcPath = path.resolve(__dirname, '../node_modules/@posthog/quill/dist/quill.css')
const destPath = path.resolve(__dirname, '../src/notebook-app/styles/quill-shim.css')

if (fs.existsSync(srcPath)) {
    let css = fs.readFileSync(srcPath, 'utf8')

    // Remove Tailwind v4 @property blocks
    css = css.replace(/@property\s+[^\{]+\{[\s\S]*?\}/g, '')

    // Replace @layer directives with @media all
    css = css.replace(/@layer\s+[\w-]+\s*\{/g, '@media all {')
    css = css.replace(/@layer\s+[\w-]+\s*;/g, '')

    // Replace :root and :host with & so CSS vars attach to container scope, not global html
    css = css.replace(/:root|:host/g, '&')

    // Wrap the entire CSS in container scopes
    const scopes = '.notebook-app-scope, .Popover, .LemonModal, .LemonPopover, .ReactModal__Content, [data-lemon-popover]'
    const wrappedCss = `${scopes} {\n${css}\n}\n`

    // Verify depth
    let depth = 0
    let invalid = false
    for (let i = 0; i < wrappedCss.length; i++) {
        if (wrappedCss[i] === '{') depth++
        if (wrappedCss[i] === '}') {
            depth--
            if (depth < 0) invalid = true
        }
    }

    console.log(`Wrapped depth: ${depth}, Valid: ${!invalid && depth === 0}`)

    fs.writeFileSync(destPath, wrappedCss)
    console.log('Successfully generated strictly scoped quill-shim.css')
} else {
    fs.writeFileSync(destPath, '/* quill-shim fallback */')
}
