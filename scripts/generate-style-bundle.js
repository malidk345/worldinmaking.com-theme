/**
 * Generates master bundle.scss for notebook-app strictly wrapped inside .notebook-app-scope.
 * Because document.body receives class 'notebook-app-scope' while Notebook is mounted:
 * 1. Notebook App (.notebook-app-scope .App) matches 100% perfectly.
 * 2. FloatingPortal popovers (.notebook-app-scope .Popover, .notebook-app-scope .LemonPopover) match 100% perfectly.
 * 3. posthog.com main site elements outside document.body matching remain 100% untouched when unmounted!
 */
const fs = require('fs')
const path = require('path')

const nbDir = path.resolve(__dirname, '../src/notebook-app')

function getFiles(dir) {
    let results = []
    const list = fs.readdirSync(dir, { withFileTypes: true })
    for (const file of list) {
        const full = path.join(dir, file.name)
        if (file.isDirectory()) {
            results = results.concat(getFiles(full))
        } else if (file.name.endsWith('.scss') || file.name.endsWith('.css')) {
            results.push(full)
        }
    }
    return results
}

const allFiles = getFiles(nbDir)
const files = allFiles.filter(f => !f.endsWith('bundle.scss') && !f.endsWith('quill-shim.css'))

const priorityOrder = [
    'styles/vars.scss',
    'styles/mixins.scss',
    'styles/fonts.scss',
    'styles/base.scss',
    'styles/global.scss',
    'styles/lemon-skin.scss',
    'styles/utilities-legacy.scss',
    'styles/index.css',
    'styles/notebook-dark-panel.scss',
    'styles/notebook.css',
    'styles/quill-bridge.scss'
]

const prioritySet = new Set(priorityOrder)
const sortedFiles = []

const quillShimPath = path.join(nbDir, 'styles/quill-shim.css')
if (fs.existsSync(quillShimPath)) {
    sortedFiles.push(quillShimPath)
}

for (const prio of priorityOrder) {
    const fullPrio = path.join(nbDir, prio.replace(/\//g, path.sep))
    if (fs.existsSync(fullPrio)) {
        sortedFiles.push(fullPrio)
    }
}

for (const f of files) {
    const rel = path.relative(nbDir, f).replace(/\\/g, '/')
    if (!prioritySet.has(rel)) {
        sortedFiles.push(f)
    }
}

const stylesDir = path.join(nbDir, 'styles')
const imports = sortedFiles.map(f => {
    let rel = path.relative(stylesDir, f).replace(/\\/g, '/')
    return `@import '${rel}';`
})

const bundleContent = `// Auto-generated master bundle for notebook-app\n` +
`.notebook-app-scope {\n` +
`  @tailwind base;\n  @tailwind components;\n  @tailwind utilities;\n\n` +
`  ` + imports.join('\n  ') + `\n` +
`}\n`

const bundlePath = path.join(stylesDir, 'bundle.scss')
fs.writeFileSync(bundlePath, bundleContent)
console.log('Successfully generated master bundle.scss wrapped inside .notebook-app-scope.')
