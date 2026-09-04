/**
 * Directed recording of the live desk (real windows, real CSS).
 * Logs click points so Remotion can zoom like Screen Studio.
 *
 *   pnpm demo:record
 */
import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, '../demo-video/public/recordings')
const BASE = process.env.DEMO_BASE_URL || 'http://localhost:3000'
const W = 1920
const H = 1080

const events = []
let t0 = 0
const mark = (label, x, y) => {
    events.push({ t: (Date.now() - t0) / 1000, label, x, y })
}

function ease(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

async function installCursor(page) {
    await page.evaluate(() => {
        if (document.getElementById('wim-demo-cursor')) return
        const el = document.createElement('div')
        el.id = 'wim-demo-cursor'
        el.innerHTML =
            '<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 3l1 16 5.2-4.2 3.3 7.2 2.4-1.1-3.3-7.1L20 13.2 4 3z" fill="#111" stroke="#fff" stroke-width="1.35" stroke-linejoin="round"/></svg>'
        el.style.cssText =
            'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));'
        document.documentElement.appendChild(el)
        window.__demoMouseX = 960
        window.__demoMouseY = 200
    })
}

async function setCursor(page, x, y, pressed = false) {
    await page.evaluate(
        ([mx, my, pressed]) => {
            window.__demoMouseX = mx
            window.__demoMouseY = my
            const el = document.getElementById('wim-demo-cursor')
            if (el) el.style.transform = `translate(${mx}px, ${my}px) scale(${pressed ? 0.86 : 1})`
        },
        [x, y, pressed]
    )
}

async function moveTo(page, x, y, steps = 36) {
    const pos = await page.evaluate(() => ({
        x: window.__demoMouseX || 960,
        y: window.__demoMouseY || 200,
    }))
    for (let i = 1; i <= steps; i++) {
        const t = ease(i / steps)
        const nx = pos.x + (x - pos.x) * t
        const ny = pos.y + (y - pos.y) * t
        await page.mouse.move(nx, ny)
        await setCursor(page, nx, ny, false)
        await page.waitForTimeout(14)
    }
}

async function clickLocator(page, locator, label) {
    await locator.waitFor({ state: 'visible', timeout: 15000 })
    const box = await locator.boundingBox()
    if (!box) throw new Error(`no box: ${label}`)
    const x = box.x + Math.min(box.width * 0.4, box.width / 2)
    const y = box.y + Math.min(16, box.height / 2)
    await moveTo(page, x, y)
    await page.waitForTimeout(350)
    await setCursor(page, x, y, true)
    mark(label, x, y)
    await page.mouse.click(x, y)
    await page.waitForTimeout(160)
    await setCursor(page, x, y, false)
    await page.waitForTimeout(500)
}

async function typeSlow(page, text) {
    for (const ch of text) {
        await page.keyboard.type(ch, { delay: 36 })
    }
}

async function leftmost(page, locator) {
    const n = await locator.count()
    let best = locator.first()
    let minX = Infinity
    for (let i = 0; i < n; i++) {
        const box = await locator.nth(i).boundingBox()
        if (box && box.x < minX) {
            minX = box.x
            best = locator.nth(i)
        }
    }
    return best
}

async function record() {
    fs.mkdirSync(outputDir, { recursive: true })
    console.log('recording', BASE, `${W}x${H}`)

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const context = await browser.newContext({
        viewport: { width: W, height: H },
        deviceScaleFactor: 1,
        recordVideo: { dir: outputDir, size: { width: W, height: H } },
    })

    await context.addInitScript(() => {
        try {
            localStorage.setItem('cookie_consent', 'yes')
            localStorage.setItem(
                'siteSettings',
                JSON.stringify({
                    colorMode: 'light',
                    theme: 'light',
                    skinMode: 'modern',
                    iconSet: 'pixel',
                    wallpaper: 'keyboard-mint',
                    reduceTransparency: true,
                    clickBehavior: 'single',
                    siteDefaultsVersion: 3,
                })
            )
        } catch {
            /* ignore */
        }
    })

    const page = await context.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await installCursor(page)
    await setCursor(page, 960, 200)
    t0 = Date.now()
    await page.waitForTimeout(1800)

    const accept = page.getByRole('button', { name: 'Accept' })
    if (await accept.isVisible().catch(() => false)) {
        await clickLocator(page, accept, 'Accept')
        await installCursor(page)
    }

    await page.locator('h1.text-xl', { hasText: 'A desktop for writing' }).waitFor({ timeout: 20000 })
    await installCursor(page)
    await page.waitForTimeout(3800)

    await clickLocator(page, page.getByRole('button', { name: /Notebooks/i }).first(), 'Notebooks')
    await page.waitForTimeout(4800)

    const threadBtn = page.locator('fieldset').filter({ hasText: 'Latest thread' }).getByRole('button').first()
    if (await threadBtn.isVisible().catch(() => false)) {
        await clickLocator(page, threadBtn, 'Thread')
        await page.waitForTimeout(4500)
    } else {
        await clickLocator(page, await leftmost(page, page.getByText('Community', { exact: true })), 'Community')
        await page.waitForTimeout(4500)
    }

    await clickLocator(page, await leftmost(page, page.getByText('WIM AI', { exact: true })), 'WIM AI')
    await page.waitForTimeout(3200)

    const chat = page.locator('textarea').last()
    if (await chat.isVisible().catch(() => false)) {
        await clickLocator(page, chat, 'Ask')
        await typeSlow(page, 'What is this desk for?')
        await page.waitForTimeout(500)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(6500)
    } else {
        await page.waitForTimeout(2800)
    }

    await moveTo(page, 980, 520, 28)
    await page.waitForTimeout(3200)

    const duration = (Date.now() - t0) / 1000
    const payload = JSON.stringify({ width: W, height: H, duration, events }, null, 2)
    fs.writeFileSync(path.join(outputDir, 'clicks.json'), payload)
    const dataDir = path.resolve(__dirname, '../demo-video/src/data')
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(path.join(dataDir, 'clicks.json'), payload)

    const video = page.video()
    await context.close()
    await browser.close()
    if (!video) throw new Error('no video')
    const src = await video.path()
    const dest = path.join(outputDir, 'real-site-demo.webm')
    fs.copyFileSync(src, dest)
    try {
        if (src !== dest) fs.unlinkSync(src)
    } catch {
        /* ignore */
    }
    console.log('saved', dest)
    console.log('clicks', events.length, 'duration', duration.toFixed(1) + 's')
}

record().catch((err) => {
    console.error(err)
    process.exit(1)
})
