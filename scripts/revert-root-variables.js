/**
 * Reverts &, :root back to plain :root in notebook-app CSS/SCSS files.
 */
const fs = require('fs')
const path = require('path')

const filesToRevert = [
    'src/notebook-app/styles/base.scss',
    'src/notebook-app/styles/index.css',
    'src/notebook-app/styles/quill-bridge.scss',
    'src/notebook-app/styles/quill-shim.css',
    'scripts/generate-quill-shim.js'
]

for (const rel of filesToRevert) {
    const full = path.resolve(__dirname, '..', rel)
    if (fs.existsSync(full)) {
        let content = fs.readFileSync(full, 'utf8')
        const updated = content.replace(/&,\s*:root/g, ':root')
        if (updated !== content) {
            fs.writeFileSync(full, updated)
            console.log(`Reverted &, :root to :root in ${rel}`)
        }
    }
}
