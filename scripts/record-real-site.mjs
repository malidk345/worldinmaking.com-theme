import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, '../demo-video/public/recordings')

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
}

async function smoothMouseMove(page, startX, startY, endX, endY, steps = 30, delayMs = 15) {
    for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        const x = startX + (endX - startX) * ease
        const y = startY + (endY - startY) * ease
        await page.mouse.move(x, y)
        await page.waitForTimeout(delayMs)
    }
}

async function record() {
    console.log('🚀 Launching Chromium for 100% Real Site Recording at 1920x1080...')
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        recordVideo: {
            dir: outputDir,
            size: { width: 1920, height: 1080 },
        },
    })

    const page = await context.newPage()

    console.log('🌐 Opening http://localhost:3000/desktop...')
    await page.goto('http://localhost:3000/desktop', { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(3000)

    // 1. Hover around the real hero window & Explore buttons
    console.log('👀 Exploring the real desktop & hero window...')
    await smoothMouseMove(page, 960, 540, 500, 340, 25, 20)
    await page.waitForTimeout(1500)

    // 2. Click "Open a notebook" button in the hero
    console.log('📓 Clicking "Open a notebook" button...')
    const notebookBtn = page.locator('text=Open a notebook').first()
    if (await notebookBtn.isVisible().catch(() => false)) {
        const btnBox = await notebookBtn.boundingBox()
        if (btnBox) {
            await smoothMouseMove(page, 500, 340, btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, 30, 15)
            await page.waitForTimeout(400)
            await page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2)
            console.log('✨ Real Notebook opened!')
        }
    }

    await page.waitForTimeout(3500)

    // 3. Move to left Desktop Apps and click "WIM AI"
    console.log('🤖 Moving to WIM AI desktop icon on the left...')
    await smoothMouseMove(page, 700, 400, 32, 310, 35, 15)
    await page.waitForTimeout(400)
    await page.mouse.click(32, 310)
    console.log('✨ Real WIM AI / Claude Workspace launched!')

    await page.waitForTimeout(3500)

    // 4. Type prompt into the real Claude Workspace Chat
    console.log('💬 Locating chat input...')
    const chatInput = page.locator('textarea').first()
    if (await chatInput.isVisible().catch(() => false)) {
        const inputBox = await chatInput.boundingBox()
        if (inputBox) {
            await smoothMouseMove(page, 32, 310, inputBox.x + 80, inputBox.y + inputBox.height / 2, 30, 15)
            await page.waitForTimeout(300)
            await page.mouse.click(inputBox.x + 80, inputBox.y + inputBox.height / 2)

            const promptText = 'What is the philosophy of WorldInMaking and how do the autonomous bots work?'
            console.log(`⌨️ Typing: "${promptText}"...`)
            for (const char of promptText) {
                await page.keyboard.type(char, { delay: 30 })
            }
            await page.waitForTimeout(600)
            await page.keyboard.press('Enter')
            console.log('🚀 Message sent!')
        }
    }

    // 5. Watch real streaming response
    console.log('⏳ Watching real streaming response...')
    await page.waitForTimeout(8000)

    // 6. Wrap up
    console.log('🎬 Wrapping up real site recording...')
    await smoothMouseMove(page, 600, 600, 960, 540, 30, 20)
    await page.waitForTimeout(2500)

    const video = page.video()
    await context.close()
    await browser.close()

    if (video) {
        const videoPath = await video.path()
        const targetPath = path.join(outputDir, 'real-site-demo.webm')
        fs.copyFileSync(videoPath, targetPath)
        console.log(`✅ 100% Real site demo video saved to: ${targetPath}`)
    }
}

record().catch((err) => {
    console.error('❌ Recording failed:', err)
    process.exit(1)
})
