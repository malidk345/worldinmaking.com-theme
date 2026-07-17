#!/usr/bin/env node
/**
 * posthog-watch.mjs
 * PostHog upstream takip aracı.
 *
 * Kullanım:
 *   node posthog-watch.mjs log          → Son 30 UI commit'i listele
 *   node posthog-watch.mjs show <sha>   → Commit detayını ve değişen dosyaları göster
 *   node posthog-watch.mjs diff <sha> <file>  → Belirli bir dosyanın diff'ini göster
 *   node posthog-watch.mjs view <sha> <file>  → PostHog'daki dosyanın içeriğini göster
 *   node posthog-watch.mjs fetch        → posthog remote'u güncelle (fetch)
 */

import { execSync } from 'child_process'

const args = process.argv.slice(2)
const cmd = args[0]

const UI_KEYWORDS = [
    'ui', 'design', 'style', 'css', 'color', 'layout', 'component',
    'window', 'taskbar', 'sidebar', 'theme', 'dark', 'light', 'blur',
    'background', 'frosted', 'glass', 'animation', 'motion', 'polish',
    'responsive', 'mobile', 'overflow', 'scroll', 'border', 'shadow',
    'icon', 'button', 'nav', 'menu', 'reader', 'pricing', 'hero',
    'transparency', 'heater', 'mesh', 'gradient', 'wallpaper'
]

function run(command) {
    try {
        return execSync(command, { encoding: 'utf-8', cwd: process.cwd() }).trim()
    } catch (e) {
        return e.stdout?.trim() || e.message
    }
}

function isUICommit(message) {
    const lower = message.toLowerCase()
    return UI_KEYWORDS.some(k => lower.includes(k))
}

function colorize(text, code) {
    return `\x1b[${code}m${text}\x1b[0m`
}

if (!cmd || cmd === 'log') {
    console.log(colorize('\n🔍 PostHog son 100 commit (UI ile ilgili olanlar vurgulanır)\n', '36'))

    const log = run('git log posthog/main --oneline -100 --no-merges')
    if (!log) {
        console.log(colorize('❌ posthog remote bulunamadı. Önce fetch yapın: node posthog-watch.mjs fetch', '31'))
        process.exit(1)
    }

    const lines = log.split('\n')
    let uiCount = 0

    lines.forEach(line => {
        const [sha, ...msgParts] = line.split(' ')
        const msg = msgParts.join(' ')
        if (isUICommit(msg)) {
            console.log(colorize(`  🎨 ${sha}`, '33') + ' ' + colorize(msg, '32'))
            uiCount++
        } else {
            console.log(`     ${colorize(sha, '90')} ${msg}`)
        }
    })

    console.log(colorize(`\n✨ ${uiCount} UI commit bulundu (${lines.length} toplam)\n`, '36'))
    console.log(colorize('Detay için: node posthog-watch.mjs show <sha>', '90'))

} else if (cmd === 'show') {
    const sha = args[1]
    if (!sha) { console.log('Kullanım: node posthog-watch.mjs show <sha>'); process.exit(1) }

    console.log(colorize(`\n📦 Commit: ${sha}\n`, '36'))

    // Commit mesajı
    const msg = run(`git show posthog/main~0 --format="%s%n%b" --name-status -- 2>/dev/null || git show ${sha} --format="%s%n%b" --name-status`)
    console.log(run(`git show ${sha} --stat --format="Author: %an (%ae)%nDate:   %ai%n%nMessage: %s%n%n%b"`))

    console.log(colorize('\nDeğişen dosyalar:', '33'))
    const files = run(`git show ${sha} --name-only --format=""`)
    files.split('\n').filter(Boolean).forEach(f => {
        const isUI = isUICommit(f) || f.includes('component') || f.includes('style') || f.includes('css')
        console.log(`  ${isUI ? colorize('🎨', '33') : '  '} ${f}`)
    })

    console.log(colorize('\nDosya içeriği için: node posthog-watch.mjs view <sha> <dosya>', '90'))
    console.log(colorize('Diff için:          node posthog-watch.mjs diff <sha> <dosya>', '90'))

} else if (cmd === 'diff') {
    const sha = args[1]
    const file = args[2]
    if (!sha || !file) { console.log('Kullanım: node posthog-watch.mjs diff <sha> <dosya>'); process.exit(1) }

    console.log(colorize(`\n📝 Diff: ${file} @ ${sha}\n`, '36'))
    console.log(run(`git show ${sha} -- "${file}"`))

} else if (cmd === 'view') {
    const sha = args[1]
    const file = args[2]
    if (!sha || !file) { console.log('Kullanım: node posthog-watch.mjs view <sha> <dosya>'); process.exit(1) }

    console.log(colorize(`\n📄 PostHog'da ${file} @ ${sha}\n`, '36'))
    console.log(run(`git show ${sha}:"${file}"`))

} else if (cmd === 'fetch') {
    console.log(colorize('\n🔄 PostHog remote güncelleniyor...\n', '36'))
    console.log(run('git fetch posthog --depth=100 --no-tags'))
    console.log(colorize('✅ Güncellendi!\n', '32'))

} else if (cmd === 'compare') {
    // Belirli bir dosyayı PostHog ile karşılaştır
    const file = args[1]
    if (!file) { console.log('Kullanım: node posthog-watch.mjs compare <posthog-dosya-yolu>'); process.exit(1) }
    console.log(colorize(`\n🔀 PostHog vs Bizim kod: ${file}\n`, '36'))
    // PostHog'un dosyasını temp'e yaz
    const content = run(`git show posthog/main:"${file}"`)
    console.log(colorize('--- PostHog versiyonu ---\n', '33'))
    console.log(content.slice(0, 3000) + (content.length > 3000 ? '\n... (kesildi)' : ''))

} else {
    console.log(`
Kullanım:
  node posthog-watch.mjs log                     → Son UI commit'leri listele
  node posthog-watch.mjs show <sha>              → Commit detayı
  node posthog-watch.mjs diff <sha> <dosya>      → Dosya diff'i
  node posthog-watch.mjs view <sha> <dosya>      → PostHog'daki dosya içeriği
  node posthog-watch.mjs compare <dosya>         → PostHog vs bizim kod
  node posthog-watch.mjs fetch                   → Remote'u güncelle
`)
}
