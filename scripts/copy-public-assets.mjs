import fs from 'fs'
import path from 'path'

const pairs = [
    ['static/philosophers', 'public/philosophers'],
    ['static/brand', 'public/brand'],
    ['static/images/wallpapers', 'public/images/wallpapers'],
    ['static/images/thinking', 'public/images/thinking'],
    ['static/robots.txt', 'public/robots.txt'],
    ['static/llms.txt', 'public/llms.txt'],
    ['static/llms-full.txt', 'public/llms-full.txt'],
    ['static/manifest.webmanifest', 'public/manifest.webmanifest'],
]

function copyPath(src, dst) {
    if (!fs.existsSync(src)) return
    if (fs.statSync(src).isDirectory()) {
        fs.mkdirSync(dst, { recursive: true })
        for (const name of fs.readdirSync(src)) {
            copyPath(path.join(src, name), path.join(dst, name))
        }
        return
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.copyFileSync(src, dst)
}

for (const [src, dst] of pairs) copyPath(src, dst)
