/**
 * Removes all global CSS/SCSS imports from notebook-app source files.
 * Next.js only allows global CSS imports from _app.tsx.
 * The styles are already included via _app.tsx imports.
 */
const fs = require('fs')
const path = require('path')

const notebookDir = path.resolve(__dirname, '../src/notebook-app')

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            walkDir(full)
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
            processFile(full)
        }
    }
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    // Remove lines that import .scss or .css files
    const lines = content.split('\n')
    const filtered = lines.filter(line => {
        const trimmed = line.trim()
        return !(
            trimmed.startsWith("import '") &&
            (trimmed.endsWith(".scss'") || trimmed.endsWith(".css'")) &&
            !trimmed.includes(' from ')
        )
    })
    if (filtered.length !== lines.length) {
        fs.writeFileSync(filePath, filtered.join('\n'))
        console.log('Stripped CSS imports from:', path.relative(notebookDir, filePath))
    }
}

walkDir(notebookDir)
console.log('\nDone — all global CSS/SCSS imports removed from notebook-app.')
