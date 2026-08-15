import fs from 'fs'
import path from 'path'

const pairs = [
    ['static/philosophers', 'public/philosophers'],
    ['static/brand', 'public/brand'],
]

function copyDir(src, dst) {
    if (!fs.existsSync(src)) return
    fs.mkdirSync(dst, { recursive: true })
    for (const name of fs.readdirSync(src)) {
        const from = path.join(src, name)
        const to = path.join(dst, name)
        if (fs.statSync(from).isDirectory()) copyDir(from, to)
        else fs.copyFileSync(from, to)
    }
}

for (const [src, dst] of pairs) copyDir(src, dst)
