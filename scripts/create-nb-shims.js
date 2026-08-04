/**
 * Scans all imports in notebook-app, checks which ones don't exist
 * in src/notebook-app/lib/, and creates minimal shim files for them.
 */
const fs   = require('fs')
const path = require('path')

const nbLib = path.resolve(__dirname, '../src/notebook-app/lib')

// ── Collect all ~nb-lib/* (i.e. lib/*) imports from notebook-app files ─────
const imports = new Set()
const nbRoot  = path.resolve(__dirname, '../src/notebook-app')

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) { walk(full); continue }
        if (!entry.name.match(/\.(tsx?|js)$/)) continue
        const src = fs.readFileSync(full, 'utf8')
        // Match: from 'lib/...' and import('lib/...')
        for (const m of src.matchAll(/(?:from |import\()['"]lib\/([^'"]+)['"]/g)) {
            imports.add(m[1])
        }
    }
}
walk(nbRoot)

// ── For each import, check if it resolves inside nb-lib ─────────────────────
let created = 0
for (const imp of [...imports].sort()) {
    const base = path.join(nbLib, imp)
    const exts = ['.tsx', '.ts', '/index.tsx', '/index.ts']
    const exists = exts.some(e => fs.existsSync(base + e))
    if (exists) continue  // already there — skip

    // Doesn't exist — create a shim
    const shimPath = base + '.ts'
    const shimDir  = path.dirname(shimPath)
    fs.mkdirSync(shimDir, { recursive: true })

    // Build a reasonable shim based on the module name
    let content = `// Auto-shim: lib/${imp} is not available in this build\n`
    content += `export const __shim = true\nexport default {} as any\n`

    fs.writeFileSync(shimPath, content)
    console.log('SHIM:', imp)
    created++
}

console.log(`\nDone — created ${created} shims.`)
