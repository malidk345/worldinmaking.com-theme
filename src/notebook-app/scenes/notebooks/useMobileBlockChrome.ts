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

        root.addEventListener('touchstart', onTouchStart, { passive: true })
        root.addEventListener('touchmove', onTouchMove, { passive: true })
        root.addEventListener('touchend', onTouchEnd)
        root.addEventListener('touchcancel', onTouchEnd)
        root.addEventListener('contextmenu', onContextMenu)
        return () => {
            clearTimer()
            root.removeEventListener('touchstart', onTouchStart)
            root.removeEventListener('touchmove', onTouchMove)
            root.removeEventListener('touchend', onTouchEnd)
            root.removeEventListener('touchcancel', onTouchEnd)
            root.removeEventListener('contextmenu', onContextMenu)
        }
    }, [rootRef])
}
