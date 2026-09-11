import { useEffect, type RefObject } from 'react'

function isCoarsePointer(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

function rowFromEvent(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) return null
    return target.closest('.MarkdownNotebook__row')
}

function openRowMenu(row: HTMLElement): void {
    const more = row.querySelector<HTMLButtonElement>('.MarkdownNotebook__block-more-btn')
    more?.click()
}

function placeBesideAnchor(anchor: DOMRect): { top: number; left: number; placement: 'above' | 'below' } {
    const padding = 8
    const gap = 8
    const height = 40
    const width = 280
    const viewport = window.visualViewport
    const viewLeft = viewport?.offsetLeft ?? 0
    const viewTop = viewport?.offsetTop ?? 0
    const viewWidth = viewport?.width ?? window.innerWidth
    const viewHeight = viewport?.height ?? window.innerHeight
    const spaceAbove = anchor.top - viewTop
    const spaceBelow = viewTop + viewHeight - anchor.bottom
    const placement: 'above' | 'below' =
        spaceAbove >= height + gap || spaceAbove >= spaceBelow ? 'above' : 'below'
    const top = placement === 'above' ? anchor.top : anchor.bottom
    const center = anchor.left + anchor.width / 2
    const half = Math.min(width / 2, Math.max(24, (viewWidth - padding * 2) / 2))
    const left = Math.min(
        Math.max(center, viewLeft + padding + half),
        viewLeft + viewWidth - padding - half
    )
    return { top, left, placement }
}

function pinMobileBlockBarToRow(): void {
    const bar = window.document.querySelector('.MarkdownNotebook__mobile-block-bar') as HTMLElement | null
    const row = window.document.querySelector('.MarkdownNotebook__row--mobile-active') as HTMLElement | null
    if (!bar || !row) return
    const pos = placeBesideAnchor(row.getBoundingClientRect())
    bar.classList.add('notebook-topbar-glass')
    bar.classList.toggle('MarkdownNotebook__mobile-block-bar--above', pos.placement === 'above')
    bar.classList.toggle('MarkdownNotebook__mobile-block-bar--below', pos.placement === 'below')
    bar.style.top = `${Math.round(pos.top)}px`
    bar.style.left = `${Math.round(pos.left)}px`
}

export function useMobileBlockChrome(rootRef: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const root = rootRef.current
        if (!root) return

        let timer: ReturnType<typeof setTimeout> | null = null
        let startX = 0
        let startY = 0
        let armedRow: HTMLElement | null = null

        const clearTimer = (): void => {
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
            armedRow = null
        }

        const onTouchStart = (event: TouchEvent): void => {
            if (!isCoarsePointer()) return
            const touch = event.changedTouches[0]
            const row = rowFromEvent(event.target)
            if (!touch || !row || row.querySelector('.MarkdownNotebook__text-block--title')) {
                clearTimer()
                return
            }
            if (
                (event.target as Element | null)?.closest(
                    'button, a, input, textarea, .MarkdownNotebook__mobile-block-bar'
                )
            ) {
                clearTimer()
                return
            }
            startX = touch.clientX
            startY = touch.clientY
            armedRow = row
            timer = setTimeout(() => {
                if (armedRow) {
                    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        try {
                            navigator.vibrate(40)
                        } catch {
                            /* ignore */
                        }
                    }
                    openRowMenu(armedRow)
                }
                clearTimer()
            }, 420)
        }

        const onTouchMove = (event: TouchEvent): void => {
            if (!timer || !armedRow) return
            const touch = event.changedTouches[0]
            if (!touch) return
            if (Math.abs(touch.clientX - startX) > 18 || Math.abs(touch.clientY - startY) > 18) {
                clearTimer()
            }
        }

        const onTouchEnd = (): void => {
            clearTimer()
        }

        const onContextMenu = (event: Event): void => {
            if (!isCoarsePointer()) return
            const row = rowFromEvent(event.target)
            if (!row) return
            event.preventDefault()
            openRowMenu(row)
        }

        const observer = new MutationObserver(() => pinMobileBlockBarToRow())
        observer.observe(window.document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['class', 'style'],
        })
        window.addEventListener('scroll', pinMobileBlockBarToRow, true)
        window.visualViewport?.addEventListener('resize', pinMobileBlockBarToRow)
        window.visualViewport?.addEventListener('scroll', pinMobileBlockBarToRow)
        pinMobileBlockBarToRow()

        root.addEventListener('touchstart', onTouchStart, { passive: true })
        root.addEventListener('touchmove', onTouchMove, { passive: true })
        root.addEventListener('touchend', onTouchEnd)
        root.addEventListener('touchcancel', onTouchEnd)
        root.addEventListener('contextmenu', onContextMenu)
        return () => {
            clearTimer()
            observer.disconnect()
            window.removeEventListener('scroll', pinMobileBlockBarToRow, true)
            window.visualViewport?.removeEventListener('resize', pinMobileBlockBarToRow)
            window.visualViewport?.removeEventListener('scroll', pinMobileBlockBarToRow)
            root.removeEventListener('touchstart', onTouchStart)
            root.removeEventListener('touchmove', onTouchMove)
            root.removeEventListener('touchend', onTouchEnd)
            root.removeEventListener('touchcancel', onTouchEnd)
            root.removeEventListener('contextmenu', onContextMenu)
        }
    }, [rootRef])
}
