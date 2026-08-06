/**
 * Bulk-safe Squeak host references for WIM:
 * - `${process.env.NEXT_PUBLIC_SQUEAK_API_HOST}/api/...` → use empty-safe host
 * - Leaves files that already guard with `const host = ...` alone if pattern not matched
 *
 * Does NOT rewrite logic; only makes template strings fail closed to relative path
 * which client guard blocks. Prefer host checks on hot paths (already done separately).
 */
import fs from 'fs'
import path from 'path'

const SKIP = new Set([
    path.normalize('src/lib/squeak.ts'),
    path.normalize('src/lib/strapi.ts'),
])

const files = []
function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        if (ent.name === 'node_modules' || ent.name === '.next') continue
        const p = path.join(d, ent.name)
        if (ent.isDirectory()) walk(p)
        else if (/\.(tsx?|jsx?)$/.test(ent.name)) files.push(p)
    }
}
walk('src')

let changed = 0
for (const f of files) {
    const rel = path.normalize(f)
    if (SKIP.has(rel) || SKIP.has(f.replace(/\\/g, '/'))) continue
    let t = fs.readFileSync(f, 'utf8')
    const orig = t

    // Avoid double-wrapping
    t = t.replace(
        /process\.env\.NEXT_PUBLIC_SQUEAK_API_HOST(?!\s*\|\|)/g,
        "(process.env.NEXT_PUBLIC_SQUEAK_API_HOST || '')"
    )
    t = t.replace(
        /process\.env\.GATSBY_SQUEAK_API_HOST(?!\s*\|\|)/g,
        "(process.env.GATSBY_SQUEAK_API_HOST || '')"
    )
    // Fix accidental double wrap
    t = t.replace(
        /\(process\.env\.NEXT_PUBLIC_SQUEAK_API_HOST \|\| ''\) \|\| ''/g,
        "(process.env.NEXT_PUBLIC_SQUEAK_API_HOST || '')"
    )
    t = t.replace(
        /\(process\.env\.GATSBY_SQUEAK_API_HOST \|\| ''\) \|\| ''/g,
        "(process.env.GATSBY_SQUEAK_API_HOST || '')"
    )

    if (t !== orig) {
        fs.writeFileSync(f, t)
        changed++
        console.log('patched', f)
    }
}
console.log('changed files:', changed)
