/**
 * Generates quill-shim.css without aggressive global svg resets so that site-wide header/nav icons
 * remain at their normal, intended sizes at all times (whether notebook is open or closed).
 */
const fs = require('fs')
const path = require('path')

const srcPath = path.resolve(__dirname, '../node_modules/@posthog/quill/dist/quill.css')
const destPath = path.resolve(__dirname, '../src/notebook-app/styles/quill-shim.css')

if (fs.existsSync(srcPath)) {
    let css = fs.readFileSync(srcPath, 'utf8')

    // Remove Tailwind v4 @property blocks (not supported by Sass)
    css = css.replace(/@property\s+[^\{]+\{[\s\S]*?\}/g, '')

    // Replace @layer directives with @media all
    css = css.replace(/@layer\s+[\w-]+\s*\{/g, '@media all {')
    css = css.replace(/@layer\s+[\w-]+\s*;/g, '')

    // Remove aggressive global svg resets that shrink header/nav icons
    css = css.replace(/svg:not\(\[class\*=['"]?size-['"]?\]\)\s*\{\s*width:\s*16px;\s*height:\s*16px;?\s*\}/g, '')
    css = css.replace(/\[\\\&_svg:not\(\[class\\\*=\\'size-\\'\]\)\]:size-4\s+svg:not\(\[class\*=size-\]\)\s*\{\s*width:\s*16px;\s*height:\s*16px;?\s*\}/g, '')
    css = css.replace(/img,svg,video,canvas,audio,iframe,embed,object\s*\{\s*vertical-align:\s*middle;\s*display:\s*block;?\s*\}/g, '')

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
    console.log('quill-shim.css generated without aggressive svg resets.')
} else {
    fs.writeFileSync(destPath, '/* quill-shim fallback */')
}
