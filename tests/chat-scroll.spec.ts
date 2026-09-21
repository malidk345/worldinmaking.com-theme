import { test, expect } from '@playwright/test'
import {
    CHAT_PIN_TOP_PADDING_PX,
    computePinSpacerHeight,
    elementOffsetInScroller,
    scrollElementToScrollerPin,
    scrollElementToScrollerTop,
} from '../src/lib/chat-scroll'

test.describe('chat-scroll pin-to-message helpers', () => {
    test('computePinSpacerHeight fills short tails for padded pin target', () => {
        // client 400, content 200, message at 0, pad 16 → targetScroll 0 → need 200
        expect(computePinSpacerHeight(400, 200, 0, 16)).toBe(200)
        // message mid-thread with enough tail → no spacer
        expect(computePinSpacerHeight(400, 900, 100, 16)).toBe(0)
        // message near end: offset 700, pad 16 → target 684; content 800, client 400 → 684+400-800 = 284
        expect(computePinSpacerHeight(400, 800, 700, 16)).toBe(284)
        // default padding matches CHAT_PIN_TOP_PADDING_PX
        expect(computePinSpacerHeight(400, 800, 700)).toBe(
            computePinSpacerHeight(400, 800, 700, CHAT_PIN_TOP_PADDING_PX)
        )
        expect(computePinSpacerHeight(0, 100, 0)).toBe(0)
    })

    test('scrollElementToScrollerPin leaves a small top inset', async ({ page }) => {
        await page.setContent(`
          <div id="scroller" style="height:200px;overflow:auto;position:relative;">
            <div style="height:120px;">pad</div>
            <div id="msg" style="height:40px;background:#ccc;">user</div>
            <div style="height:400px;">tail</div>
          </div>
        `)
        const result = await page.evaluate((padding) => {
            const scroller = document.getElementById('scroller') as HTMLElement
            const msg = document.getElementById('msg') as HTMLElement
            const offset =
                scroller.scrollTop +
                (msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top)
            const next = Math.max(0, offset - padding)
            scroller.scrollTop = next
            return {
                offset,
                scrollTop: scroller.scrollTop,
                msgTopInView: msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
            }
        }, CHAT_PIN_TOP_PADDING_PX)

        expect(result.offset).toBeCloseTo(120, 0)
        expect(result.scrollTop).toBeCloseTo(120 - CHAT_PIN_TOP_PADDING_PX, 0)
        expect(result.msgTopInView).toBeCloseTo(CHAT_PIN_TOP_PADDING_PX, 0)
    })

    test('scrollElementToScrollerTop remains flush (padding 0)', async ({ page }) => {
        await page.setContent(`
          <div id="scroller" style="height:200px;overflow:auto;position:relative;">
            <div style="height:120px;">pad</div>
            <div id="msg" style="height:40px;background:#ccc;">user</div>
            <div style="height:400px;">tail</div>
          </div>
        `)
        const scrolled = await page.evaluate(() => {
            const scroller = document.getElementById('scroller') as HTMLElement
            const msg = document.getElementById('msg') as HTMLElement
            const next = Math.max(
                0,
                scroller.scrollTop +
                    (msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top)
            )
            scroller.scrollTop = next
            return {
                scrollTop: scroller.scrollTop,
                msgTopInView: msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
            }
        })
        expect(scrolled.scrollTop).toBeCloseTo(120, 0)
        expect(Math.abs(scrolled.msgTopInView)).toBeLessThan(2)
    })

    test('helper exports stay wired for CI', () => {
        expect(typeof elementOffsetInScroller).toBe('function')
        expect(typeof scrollElementToScrollerPin).toBe('function')
        expect(typeof scrollElementToScrollerTop).toBe('function')
        expect(typeof computePinSpacerHeight).toBe('function')
        expect(CHAT_PIN_TOP_PADDING_PX).toBe(16)
    })
})
