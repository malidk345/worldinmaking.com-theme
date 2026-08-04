/**
 * Fixes :root selectors in notebook-app CSS/SCSS files so CSS variables
 * attach directly to .notebook-app-scope, .Popover, and .LemonModal when compiled by Sass.
 */
const fs = require('fs')
const path = require('path')

// 1. Update generate-quill-shim.js so quill-shim.css uses &, :root instead of plain :root
const shimScriptPath = path.resolve(__dirname, 'generate-quill-shim.js')
let shimScript = fs.readFileSync(shimScriptPath, 'utf8')

// Add replacement for :root -> &, :root in generate-quill-shim.js
if (!shimScript.includes(':root -> &, :root')) {
    shimScript = shimScript.replace(
        "fs.writeFileSync(destPath, css)",
        "css = css.replace(/:root/g, '&, :root')\n    fs.writeFileSync(destPath, css)"
    )
    fs.writeFileSync(shimScriptPath, shimScript)
    console.log('Updated generate-quill-shim.js to replace :root with &, :root.')
}

// 2. Also replace :root in base.scss, index.css, quill-bridge.scss
const filesToFix = [
    'src/notebook-app/styles/base.scss',
    'src/notebook-app/styles/index.css',
    'src/notebook-app/styles/quill-bridge.scss'
]

for (const rel of filesToFix) {
    const full = path.resolve(__dirname, '..', rel)
    if (fs.existsSync(full)) {
        let content = fs.readFileSync(full, 'utf8')
        // Replace standalone :root { or :root, with &, :root { or &, :root,
        const updated = content.replace(/(^|[\s\}]):root([\s,\{])/g, '$1&, :root$2')
        if (updated !== content) {
            fs.writeFileSync(full, updated)
            console.log(`Replaced :root with &, :root in ${rel}`)
        }
    }
}
