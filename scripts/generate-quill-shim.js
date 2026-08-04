/**
 * Safely converts Tailwind v4 @layer directives in quill.css to standard @media all blocks,
 * and scopes global resets (svg, button, *, img) strictly under .notebook-app-scope and Portals.
 */
const fs = require('fs')
const path = require('path')

const sourcePath = path.resolve(__dirname, '../node_modules/@posthog/quill/dist/quill.css')
const destPath   = path.resolve(__dirname, '../src/notebook-app/styles/quill-shim.css')

if (fs.existsSync(sourcePath)) {
    let css = fs.readFileSync(sourcePath, 'utf8')

    // Remove Tailwind v4 @property blocks (not supported by Sass)
    css = css.replace(/@property\s+[^\{]+\{[\s\S]*?\}/g, '')

    // Replace @layer <name> { with @media all {
    css = css.replace(/@layer\s+[\w-]+\s*\{/g, '@media all {')
             .replace(/@layer\s+[\w-]+\s*;/g, '')

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

    // Verify depth
    let depth = 0
    let invalid = false
    for (let i = 0; i < css.length; i++) {
        if (css[i] === '{') depth++
        if (css[i] === '}') {
            depth--
            if (depth < 0) invalid = true
        }
    }

    console.log(`Final depth: ${depth}, Valid: ${!invalid && depth === 0}`)

    fs.writeFileSync(destPath, css)
    console.log('quill-shim.css generated with scoped global resets and @media all wrapper.')
} else {
    fs.writeFileSync(destPath, '/* quill-shim fallback */')
}
