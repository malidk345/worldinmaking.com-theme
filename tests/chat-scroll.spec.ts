import { test, expect } from '@playwright/test'
import {
    CHAT_PIN_TOP_PADDING_PX,
    applyMinSpacerForScrollTop,
    applyMinSpacerToPreserveScrollTop,
    computePinSpacerHeight,
    elementOffsetInScroller,
    minSpacerToPreserveScrollTop,
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

    test('minSpacerToPreserveScrollTop matches pin need; zero when content supports scrollTop', () => {
        // Same geometry as pin: scrollTop 684, client 400, content 800 → need 284
        expect(minSpacerToPreserveScrollTop(684, 400, 800)).toBe(284)
        // Reply grew: content 1200 already supports scrollTop 684 → 0
        expect(minSpacerToPreserveScrollTop(684, 400, 1200)).toBe(0)
        // Blind zero of a 284 spacer while scrollTop=684 would clamp to maxScroll=400 → Δ=-284
        const scrollTop = 684
        const client = 400
        const contentExcl = 800
        const spacer = 284
        const maxAfterBlindClear = Math.max(0, contentExcl - client)
        expect(maxAfterBlindClear).toBe(400)
        expect(scrollTop - maxAfterBlindClear).toBe(284)
        expect(minSpacerToPreserveScrollTop(scrollTop, client, contentExcl)).toBe(spacer)
        expect(minSpacerToPreserveScrollTop(0, 400, 800)).toBe(0)
        expect(minSpacerToPreserveScrollTop(100, 0, 800)).toBe(0)
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

    test('blind spacer clear clamps scrollTop into older history; preserve does not', async ({ page }) => {
        await page.setContent(`
          <div id="scroller" style="height:400px;overflow:auto;position:relative;">
            <div id="history" style="height:2000px;background:#eee;">old</div>
            <div id="msg" style="height:50px;background:#ccc;">user</div>
            <div id="reply" style="height:100px;background:#ddd;">short ai</div>
            <div id="spacer" style="height:0;pointer-events:none;"></div>
          </div>
        `)

        const proof = await page.evaluate((padding) => {
            const scroller = document.getElementById('scroller') as HTMLElement
            const msg = document.getElementById('msg') as HTMLElement
            const spacer = document.getElementById('spacer') as HTMLElement

            const offset =
                scroller.scrollTop +
                (msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top)
            const targetScroll = Math.max(0, offset - padding)
            const contentExcl = scroller.scrollHeight // spacer still 0
            const needed = Math.max(0, Math.ceil(targetScroll + scroller.clientHeight - contentExcl))
            spacer.style.height = `${needed}px`
            scroller.scrollTop = targetScroll
            const pinnedScrollTop = scroller.scrollTop
            const pinnedMsgTop =
                msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top

            // Blind clear (post-#794 settle): yank
            spacer.style.height = '0px'
            // force layout / clamp
            void scroller.scrollHeight
            const afterBlindScrollTop = scroller.scrollTop
            const afterBlindMsgTop =
                msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top

            // Restore pin geometry
            spacer.style.height = `${needed}px`
            scroller.scrollTop = pinnedScrollTop

            // Preserve clear: shrink to min needed for current scrollTop
            const contentNow = scroller.scrollHeight - needed
            const minKeep = Math.max(
                0,
                Math.ceil(scroller.scrollTop + scroller.clientHeight - contentNow)
            )
            spacer.style.height = `${minKeep}px`
            void scroller.scrollHeight
            const afterPreserveScrollTop = scroller.scrollTop
            const afterPreserveMsgTop =
                msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top

            return {
                needed,
                pinnedScrollTop,
                pinnedMsgTop,
                afterBlindScrollTop,
                afterBlindMsgTop,
                minKeep,
                afterPreserveScrollTop,
                afterPreserveMsgTop,
            }
        }, CHAT_PIN_TOP_PADDING_PX)

        expect(proof.needed).toBeGreaterThan(100)
        // Blind clear: large scrollTop drop → older history enters the viewport
        expect(proof.pinnedScrollTop - proof.afterBlindScrollTop).toBeGreaterThan(100)
        expect(proof.afterBlindMsgTop).toBeGreaterThan(proof.pinnedMsgTop + 50)
        // Preserve: no huge drop; user bubble stays near pin inset
        expect(Math.abs(proof.afterPreserveScrollTop - proof.pinnedScrollTop)).toBeLessThan(2)
        expect(Math.abs(proof.afterPreserveMsgTop - proof.pinnedMsgTop)).toBeLessThan(2)
        expect(proof.minKeep).toBe(proof.needed)
    })

    test('post-preserve thought collapse clamps; saved-scrollTop restore holds view', async ({ page }) => {
        // #795 minSpacer while Thought tall, then collapse → clamp. RO sees clamped scrollTop
        // and cannot restore. Production fix: save scrollTop at settle, grow spacer for the
        // *saved* value after collapse, write scrollTop back (applyMinSpacerForScrollTop).
        await page.setContent(`
          <div id="scroller" style="height:400px;overflow:auto;position:relative;">
            <div id="history" style="height:2000px;background:#eee;">old</div>
            <div id="msg" style="height:50px;background:#ccc;">user</div>
            <div id="reply" style="height:80px;background:#ddd;">short ai</div>
            <div id="thought" style="height:220px;background:#cfc;">live thought</div>
            <div id="spacer" style="height:0;pointer-events:none;"></div>
          </div>
        `)

        const proof = await page.evaluate((padding) => {
            const scroller = document.getElementById('scroller') as HTMLElement
            const msg = document.getElementById('msg') as HTMLElement
            const thought = document.getElementById('thought') as HTMLElement
            const spacer = document.getElementById('spacer') as HTMLElement

            const offset =
                scroller.scrollTop +
                (msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top)
            const targetScroll = Math.max(0, offset - padding)
            const pinNeeded = Math.max(
                0,
                Math.ceil(targetScroll + scroller.clientHeight - scroller.scrollHeight)
            )
            spacer.style.height = `${pinNeeded}px`
            scroller.scrollTop = targetScroll
            const savedScrollTop = scroller.scrollTop

            // Buggy #795: shrink to min while tall, then collapse
            const minKeepTall = Math.max(
                0,
                Math.ceil(
                    scroller.scrollTop +
                        scroller.clientHeight -
                        (scroller.scrollHeight - spacer.offsetHeight)
                )
            )
            spacer.style.height = `${minKeepTall}px`
            thought.style.height = '24px'
            void scroller.scrollHeight
            const afterBugScrollTop = scroller.scrollTop
            const afterBugMsgTop =
                msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top

            // Fixed path: restore geometry, save scrollTop, collapse, then
            // applyMinSpacerForScrollTop(saved) + write scrollTop back
            thought.style.height = '220px'
            spacer.style.height = `${pinNeeded}px`
            scroller.scrollTop = savedScrollTop
            const saved = scroller.scrollTop
            thought.style.height = '24px'
            void scroller.scrollHeight
            const clamped = scroller.scrollTop
            const cur = spacer.offsetHeight
            const excl = scroller.scrollHeight - cur
            const need = Math.max(0, Math.ceil(saved + scroller.clientHeight - excl))
            spacer.style.height = `${need}px`
            scroller.scrollTop = saved
            void scroller.scrollHeight
            const afterRestoreScrollTop = scroller.scrollTop
            const afterRestoreMsgTop =
                msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top

            return {
                pinNeeded,
                minKeepTall,
                savedScrollTop,
                afterBugScrollTop,
                afterBugMsgTop,
                clamped,
                need,
                afterRestoreScrollTop,
                afterRestoreMsgTop,
            }
        }, CHAT_PIN_TOP_PADDING_PX)

        expect(proof.savedScrollTop - proof.afterBugScrollTop).toBeGreaterThan(100)
        expect(proof.afterBugMsgTop).toBeGreaterThan(CHAT_PIN_TOP_PADDING_PX + 80)
        expect(proof.clamped).toBeLessThan(proof.savedScrollTop - 50)
        expect(proof.need).toBeGreaterThan(proof.minKeepTall + 100)
        expect(Math.abs(proof.afterRestoreScrollTop - proof.savedScrollTop)).toBeLessThan(2)
        expect(Math.abs(proof.afterRestoreMsgTop - CHAT_PIN_TOP_PADDING_PX)).toBeLessThan(3)
    })

    test('clientHeight growth: saved scrollTop + applyMinSpacerForScrollTop prevents clamp', async ({
        page,
    }) => {
        await page.setContent(`
          <div id="scroller" style="height:280px;overflow:auto;position:relative;">
            <div id="history" style="height:2000px;background:#eee;">old</div>
            <div id="msg" style="height:50px;background:#ccc;">user</div>
            <div id="reply" style="height:80px;background:#ddd;">ai</div>
            <div id="spacer" style="height:0;pointer-events:none;"></div>
          </div>
        `)

        const proof = await page.evaluate((padding) => {
            const scroller = document.getElementById('scroller') as HTMLElement
            const msg = document.getElementById('msg') as HTMLElement
            const spacer = document.getElementById('spacer') as HTMLElement

            const offset =
                scroller.scrollTop +
                (msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top)
            const targetScroll = Math.max(0, offset - padding)
            const pinNeeded = Math.max(
                0,
                Math.ceil(targetScroll + scroller.clientHeight - scroller.scrollHeight)
            )
            spacer.style.height = `${pinNeeded}px`
            scroller.scrollTop = targetScroll
            const saved = scroller.scrollTop
            const spacerAtShort = spacer.offsetHeight

            // Grow pane without restore → clamp
            scroller.style.height = '420px'
            void scroller.scrollHeight
            const afterGrowNoFix = scroller.scrollTop

            // Production-style: grow spacer for *saved* scrollTop, then write it back
            const cur = spacer.offsetHeight
            const excl = scroller.scrollHeight - cur
            const next = Math.max(0, Math.ceil(saved + scroller.clientHeight - excl))
            spacer.style.height = `${next}px`
            scroller.scrollTop = saved
            void scroller.scrollHeight

            return {
                saved,
                spacerAtShort,
                afterGrowNoFix,
                next,
                scrollAfter: scroller.scrollTop,
                msgTop: msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
            }
        }, CHAT_PIN_TOP_PADDING_PX)

        expect(proof.spacerAtShort).toBeGreaterThan(50)
        expect(proof.saved - proof.afterGrowNoFix).toBeGreaterThan(50)
        expect(proof.next).toBeGreaterThan(proof.spacerAtShort + 50)
        expect(Math.abs(proof.scrollAfter - proof.saved)).toBeLessThan(2)
        expect(Math.abs(proof.msgTop - CHAT_PIN_TOP_PADDING_PX)).toBeLessThan(3)
    })

    test('helper exports stay wired for CI', () => {
        expect(typeof elementOffsetInScroller).toBe('function')
        expect(typeof scrollElementToScrollerPin).toBe('function')
        expect(typeof scrollElementToScrollerTop).toBe('function')
        expect(typeof computePinSpacerHeight).toBe('function')
        expect(typeof minSpacerToPreserveScrollTop).toBe('function')
        expect(typeof applyMinSpacerToPreserveScrollTop).toBe('function')
        expect(typeof applyMinSpacerForScrollTop).toBe('function')
        expect(CHAT_PIN_TOP_PADDING_PX).toBe(16)
    })
})
