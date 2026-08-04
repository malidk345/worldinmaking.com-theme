/**
 * Generates quill-shim.css with specific global element resets strictly scoped
 * to prevent leaking into posthog.com main site icons, buttons, or layouts.
 */
const fs = require('fs')
const path = require('path')

const srcPath = path.resolve(__dirname, '../node_modules/@posthog/quill/dist/quill.css')
const destPath = path.resolve(__dirname, '../src/notebook-app/styles/quill-shim.css')

if (!fs.existsSync(srcPath)) {
    console.error('Source quill.css not found at', srcPath)
    process.exit(1)
}

let css = fs.readFileSync(srcPath, 'utf8')

// Remove @property blocks
css = css.replace(/@property\s+[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, '')

// Replace @layer directives with @media all
css = css.replace(/@layer\s+base\s*\{/g, '@media all {')
css = css.replace(/@layer\s+utilities\s*\{/g, '@media all {')
css = css.replace(/@layer\s+components\s*\{/g, '@media all {')
css = css.replace(/@layer\s+properties\s*\{/g, '@media all {')

// Define precise scope replacement for global resets
const scopes = ['.notebook-app-scope', '.Popover', '.LemonModal', '.LemonPopover', '.ReactModal__Content', '[data-lemon-popover]']

function scopeSelector(selectorStr) {
    const parts = selectorStr.split(',').map(s => s.trim())
    const scopedParts = []
    for (const p of parts) {
        for (const scope of scopes) {
            scopedParts.push(`${scope} ${p}`)
        }
    }
    return scopedParts.join(', ')
}

// Target specific global reset rules in Tailwind v4 quill.css
css = css.replace(
    'img,svg,video,canvas,audio,iframe,embed,object{vertical-align:middle;display:block}',
    `${scopeSelector('img,svg,video,canvas,audio,iframe,embed,object')}{vertical-align:middle;display:block}`
)

css = css.replace(
    'button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}',
    `${scopeSelector('button,input,select,optgroup,textarea')}{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}`
)

css = css.replace(
    '*{border-color:var(--border);outline-color:var(--ring)}',
    `${scopeSelector('*')}{border-color:var(--border);outline-color:var(--ring)}`
)

css = css.replace(
    'svg:not([class*=size-]){width:16px;height:16px}',
    `${scopeSelector('svg:not([class*=size-])')}{width:16px;height:16px}`
)

fs.writeFileSync(destPath, css)
console.log('Successfully generated clean scoped quill-shim.css')
