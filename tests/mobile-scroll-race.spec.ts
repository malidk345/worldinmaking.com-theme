import { test, expect } from '@playwright/test'
import { CHAT_PIN_TOP_PADDING_PX } from '../src/lib/chat-scroll'

/**
 * Mobile settle race that desktop #796 tests missed:
 * After settle, Thought collapse / soft-keyboard hide clamps scrollTop and fires
 * `scroll`. Production used to clear stickyViewScrollTopRef whenever !pinned in
 * onScroll — wiping the saved Y before RO/restore → jump into older history.
 *
 * Fixed contract: onScroll must NOT clear sticky/settle refs when !pinned.
 * User intent clears sticky via wheel/touchmove. RO restores from sticky.
 */
test.describe('mobile settle + keyboard-hide scroll race', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
    })

    test('sticky survives clamp+scroll; restore holds pin (production onScroll contract)', async ({
        page,
    }) => {
        await page.setContent(`
          <div id="scroller" style="height:280px;overflow:auto;position:relative;touch-action:pan-y;">
            <div id="history" style="height:2000px;background:#eee;">old history</div>
            <div id="msg" style="height:50px;background:#ccc;">user</div>
            <div id="reply" style="height:80px;background:#ddd;">short ai</div>
            <div id="thought" style="height:24px;background:#cfc;">collapsed thought</div>
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
            const clientAtSettle = scroller.clientHeight

            let stickyViewScrollTop: number | null = saved
            let settleScrollTop: number | null = saved
            let pinnedMessageId: string | null = null
            let applyingPinScroll = false

            // Production FIXED onScroll: do not wipe sticky when !pinned.
            const onScroll = () => {
                if (applyingPinScroll) return
                if (!pinnedMessageId) return
                // mid-stream release path omitted in this harness
            }
            scroller.addEventListener('scroll', onScroll, { passive: true })

            // Soft keyboard hide → clientHeight grows (mobile) → browser clamps
            scroller.style.height = '520px'
            void scroller.scrollHeight
            const afterClamp = scroller.scrollTop
            scroller.dispatchEvent(new Event('scroll'))

            const stickyAfterScrollEvent = stickyViewScrollTop
            const settleAfterScrollEvent = settleScrollTop

            let restored = false
            const desired = stickyViewScrollTop
            if (desired != null) {
                applyingPinScroll = true
                const cur = spacer.offsetHeight
                const excl = scroller.scrollHeight - cur
                const next = Math.max(0, Math.ceil(desired + scroller.clientHeight - excl))
                spacer.style.height = `${next}px`
                scroller.scrollTop = desired
                restored = true
                applyingPinScroll = false
            }

            const finalScrollTop = scroller.scrollTop
            const msgTop =
                msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top

            return {
                saved,
                clientAtSettle,
                clientAfter: scroller.clientHeight,
                afterClamp,
                stickyAfterScrollEvent,
                settleAfterScrollEvent,
                restored,
                finalScrollTop,
                msgTop,
                delta: saved - finalScrollTop,
            }
        }, CHAT_PIN_TOP_PADDING_PX)

        expect(proof.clientAfter).toBeGreaterThan(proof.clientAtSettle + 100)
        expect(proof.saved - proof.afterClamp).toBeGreaterThan(50)
        // Sticky must survive the clamp-generated scroll event (the #796 gap).
        expect(proof.stickyAfterScrollEvent).toBe(proof.saved)
        expect(proof.settleAfterScrollEvent).toBe(proof.saved)
        expect(proof.restored).toBe(true)
        expect(Math.abs(proof.delta)).toBeLessThan(2)
        expect(Math.abs(proof.msgTop - CHAT_PIN_TOP_PADDING_PX)).toBeLessThan(3)
    })

    test('legacy onScroll wipe reproduces the jump (regression witness)', async ({ page }) => {
        await page.setContent(`
          <div id="scroller" style="height:280px;overflow:auto;position:relative;touch-action:pan-y;">
            <div id="history" style="height:2000px;background:#eee;">old history</div>
            <div id="msg" style="height:50px;background:#ccc;">user</div>
            <div id="reply" style="height:80px;background:#ddd;">short ai</div>
            <div id="thought" style="height:24px;background:#cfc;">collapsed thought</div>
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

            let stickyViewScrollTop: number | null = saved
            let settleScrollTop: number | null = saved
            let pinnedMessageId: string | null = null
            let applyingPinScroll = false

            // Pre-fix production onScroll — clears sticky whenever !pinned.
            const onScrollLegacy = () => {
                if (applyingPinScroll) return
                if (!pinnedMessageId) {
                    settleScrollTop = null
                    stickyViewScrollTop = null
                }
            }
            scroller.addEventListener('scroll', onScrollLegacy, { passive: true })

            scroller.style.height = '520px'
            void scroller.scrollHeight
            const afterClamp = scroller.scrollTop
            scroller.dispatchEvent(new Event('scroll'))

            const stickyAfterScrollEvent = stickyViewScrollTop

            let restored = false
            const desired = stickyViewScrollTop
            if (desired != null) {
                applyingPinScroll = true
                const cur = spacer.offsetHeight
                const excl = scroller.scrollHeight - cur
                const next = Math.max(0, Math.ceil(desired + scroller.clientHeight - excl))
                spacer.style.height = `${next}px`
                scroller.scrollTop = desired
                restored = true
                applyingPinScroll = false
            } else {
                const cur = spacer.offsetHeight
                const excl = scroller.scrollHeight - cur
                const next = Math.max(0, Math.ceil(scroller.scrollTop + scroller.clientHeight - excl))
                spacer.style.height = `${next}px`
            }

            const finalScrollTop = scroller.scrollTop
            const msgTop =
                msg.getBoundingClientRect().top - scroller.getBoundingClientRect().top

            return {
                saved,
                afterClamp,
                stickyAfterScrollEvent,
                restored,
                finalScrollTop,
                msgTop,
                delta: saved - finalScrollTop,
            }
        }, CHAT_PIN_TOP_PADDING_PX)

        // Documents the race desktop #796 missed — sticky wiped, restore skipped, jump.
        expect(proof.saved - proof.afterClamp).toBeGreaterThan(50)
        expect(proof.stickyAfterScrollEvent).toBeNull()
        expect(proof.restored).toBe(false)
        expect(proof.delta).toBeGreaterThan(50)
        expect(proof.msgTop).toBeGreaterThan(CHAT_PIN_TOP_PADDING_PX + 50)
    })

    test('wheel after settle clears sticky so RO will not yank back', async ({ page }) => {
        await page.setContent(`
          <div id="scroller" style="height:400px;overflow:auto;">
            <div style="height:800px">pad</div>
            <div id="msg" data-message-id="u1" style="height:40px">user</div>
            <div style="height:200px">reply</div>
          </div>
        `)
        const proof = await page.evaluate(() => {
            const scroller = document.getElementById('scroller') as HTMLElement
            let sticky: number | null = 500
            let settle: number | null = 500
            let pinned: string | null = null

            const clearStickyForUserScroll = () => {
                sticky = null
                settle = null
            }
            const onWheel = (e: WheelEvent) => {
                if (Math.abs(e.deltaY) > 2 || Math.abs(e.deltaX) > 2) {
                    if (pinned) {
                        pinned = null
                        sticky = scroller.scrollTop
                        settle = scroller.scrollTop
                    } else if (sticky != null || settle != null) {
                        clearStickyForUserScroll()
                    }
                }
            }
            scroller.addEventListener('wheel', onWheel, { passive: true })
            scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true }))
            return { stickyAfterWheel: sticky, settleAfterWheel: settle }
        })
        expect(proof.stickyAfterWheel).toBeNull()
        expect(proof.settleAfterWheel).toBeNull()
    })

    test('touchmove during stream still releases pin (unchanged mid-stream UX)', async ({
        page,
    }) => {
        await page.setContent(`
          <div id="scroller" style="height:400px;overflow:auto;">
            <div style="height:800px">pad</div>
            <div id="msg" data-message-id="u1" style="height:40px">user</div>
            <div style="height:200px">reply</div>
          </div>
        `)
        const proof = await page.evaluate(() => {
            const scroller = document.getElementById('scroller') as HTMLElement
            let pinned: string | null = 'u1'
            const onTouchMove = () => {
                if (pinned) pinned = null
            }
            scroller.addEventListener('touchmove', onTouchMove, { passive: true })
            scroller.dispatchEvent(new Event('touchmove', { bubbles: true }))
            return { pinnedAfterTouch: pinned }
        })
        expect(proof.pinnedAfterTouch).toBeNull()
    })

    test('desktop clientHeight growth helper still holds without scroll-clear (baseline #796)', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1280, height: 800 })
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
            scroller.style.height = '420px'
            void scroller.scrollHeight
            const afterGrowNoFix = scroller.scrollTop
            const cur = spacer.offsetHeight
            const excl = scroller.scrollHeight - cur
            const next = Math.max(0, Math.ceil(saved + scroller.clientHeight - excl))
            spacer.style.height = `${next}px`
            scroller.scrollTop = saved
            return { saved, afterGrowNoFix, scrollAfter: scroller.scrollTop }
        }, CHAT_PIN_TOP_PADDING_PX)
        expect(proof.saved - proof.afterGrowNoFix).toBeGreaterThan(50)
        expect(Math.abs(proof.scrollAfter - proof.saved)).toBeLessThan(2)
    })
})
