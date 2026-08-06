import fs from 'fs'
import path from 'path'

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

const byFile = {}
let count = 0
for (const f of files) {
    const t = fs.readFileSync(f, 'utf8')
    const n = (t.match(/NEXT_PUBLIC_SQUEAK_API_HOST|GATSBY_SQUEAK_API_HOST|SQUEAK_HOST/g) || []).length
    if (n) {
        count += n
        byFile[f] = n
    }
}
console.log('files', Object.keys(byFile).length, 'refs', count)
for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 30)) {
    console.log(n, f)
}
