const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const srcRoot = path.resolve(__dirname, '../../posthog-notebook-app')

// Restore Publish modal from source with import rewrite
const publishSrc = path.join(srcRoot, 'src/scenes/notebooks/NotebookPublishModal.tsx')
const publishDst = path.join(root, 'src/notebook-app/scenes/notebooks/NotebookPublishModal.tsx')
if (fs.existsSync(publishSrc)) {
    let content = fs.readFileSync(publishSrc, 'utf8')
    content = content.replace("from '@posthog/lemon-ui'", "from '~nb-lib/lemon-ui/index'")
    fs.writeFileSync(publishDst, content)
}

// Fix common UTF-8 mojibake sequences
const files = [
    'src/notebook-app/scenes/notebooks/AskAIDropdown.tsx',
    'src/notebook-app/scenes/notebooks/NotebookCanvasScene.tsx',
    'src/notebook-app/scenes/notebooks/NotebooksListScene.tsx',
    'src/notebook-app/App.tsx',
]

const replacements = [
    ['\u00e2\u20ac\u00a2', '\u2022'], // â€¢ → •
    ['\u00e2\u20ac\u201d', '\u2014'], // â€” → —
    ['\u00e2\u20ac\u201c', '\u2013'], // â€“ → –
    ['\u00e2\u20ac\u2122', '\u2019'], // â€™ → ’
]

for (const rel of files) {
    const file = path.join(root, rel)
    if (!fs.existsSync(file)) continue
    let content = fs.readFileSync(file, 'utf8')
    let next = content
    for (const [from, to] of replacements) {
        next = next.split(from).join(to)
    }
    // Also fix already-decoded mojibake literals if present as UTF-8 chars
    next = next.replace(/â€¢/g, '•').replace(/â€”/g, '—').replace(/â€“/g, '–').replace(/â€™/g, "'")
    if (next !== content) {
        fs.writeFileSync(file, next)
    } else {
    }
}

const publish = fs.readFileSync(publishDst, 'utf8')
const m = publish.match(/title="([^"]+)"/)
