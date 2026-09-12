export type MobileBlockBarAnchor = {
    top: number
    left: number
    placement: 'above' | 'below'
}

export function computeMobileBlockBarPosition(
    row: { getBoundingClientRect: () => { top: number; bottom: number; left: number; right?: number; width: number; height: number } } | null | undefined,
    options?: {
        touchY?: number
        viewport?: {
            offsetLeft?: number
            offsetTop?: number
            width?: number
            height?: number
        }
    }
): MobileBlockBarAnchor | null {
    if (!row || typeof row.getBoundingClientRect !== 'function') {
        return null
    }

    try {
        const vv = options?.viewport ?? (typeof window !== 'undefined' ? window.visualViewport : null)
        const viewTop = vv?.offsetTop ?? 0
        const viewLeft = vv?.offsetLeft ?? 0
        const viewWidth = vv?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 375)
        const viewHeight = vv?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 667)
        const viewBottom = viewTop + viewHeight
        const viewRight = viewLeft + viewWidth

        const rowRect = row.getBoundingClientRect()
        if (!rowRect || typeof rowRect.top !== 'number' || typeof rowRect.bottom !== 'number') {
            return null
        }

        if (rowRect.bottom < viewTop - 10 || rowRect.top > viewBottom + 10) {
            return null
        }

    const margin = 8
    const barEstimatedHeight = 36
    const estimatedHalfBarWidth = 120

    const rowCenter = rowRect.left + rowRect.width / 2
    const left = Math.round(
        viewWidth < 640
            ? viewLeft + viewWidth / 2
            : Math.min(
                  viewRight - margin - estimatedHalfBarWidth,
                  Math.max(viewLeft + margin + estimatedHalfBarWidth, rowCenter)
              )
    )

    const spaceAbove = rowRect.top - viewTop
    const spaceBelow = viewBottom - rowRect.bottom
    const hasSpaceAbove = spaceAbove >= barEstimatedHeight + 8
    const hasSpaceBelow = spaceBelow >= barEstimatedHeight + 8

    let placement: 'above' | 'below' = 'above'
    let top: number

    if (hasSpaceAbove) {
        placement = 'above'
        top = Math.round(rowRect.top)
    } else if (hasSpaceBelow) {
        placement = 'below'
        top = Math.round(rowRect.bottom)
    } else {
        const anchorY =
            typeof options?.touchY === 'number'
                ? options.touchY
                : Math.max(
                      viewTop + barEstimatedHeight + 8,
                      Math.min(viewBottom - barEstimatedHeight - 8, (rowRect.top + rowRect.bottom) / 2)
                  )
        if (anchorY - viewTop >= barEstimatedHeight + 16) {
            placement = 'above'
            top = Math.round(anchorY)
        } else {
            placement = 'below'
            top = Math.round(anchorY)
        }
    }

        if (placement === 'above') {
            top = Math.max(viewTop + barEstimatedHeight + margin, top)
        } else {
            top = Math.min(viewBottom - barEstimatedHeight - margin, top)
        }

        return { top, left, placement }
    } catch {
        return null
    }
}
