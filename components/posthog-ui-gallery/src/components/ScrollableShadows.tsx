import React, { useRef, useState, useEffect, useCallback } from 'react'
import clsx from 'clsx'

export interface ScrollableShadowsProps {
  children: React.ReactNode
  direction?: 'horizontal' | 'vertical' | 'both'
  className?: string
  innerClassName?: string
  style?: React.CSSProperties
  hideScrollbars?: boolean
  hideShadows?: boolean
}

export function ScrollableShadows({
  children,
  direction = 'horizontal',
  className,
  innerClassName,
  style,
  hideScrollbars = false,
  hideShadows = false,
}: ScrollableShadowsProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  const [overflows, setOverflows] = useState<{
    xStart: boolean
    xEnd: boolean
    yStart: boolean
    yEnd: boolean
  }>({
    xStart: false,
    xEnd: false,
    yStart: false,
    yEnd: false,
  })

  const checkScroll = useCallback(() => {
    const el = innerRef.current
    if (!el) return

    const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = el

    const xStart = scrollLeft > 2
    const xEnd = scrollLeft + clientWidth < scrollWidth - 2
    const yStart = scrollTop > 2
    const yEnd = scrollTop + clientHeight < scrollHeight - 2

    setOverflows({ xStart, xEnd, yStart, yEnd })
  }, [])

  useEffect(() => {
    const el = innerRef.current
    if (!el) return

    checkScroll()

    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)

    // ResizeObserver to detect content size changes
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    if (el.firstElementChild) {
      ro.observe(el.firstElementChild)
    }

    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
      ro.disconnect()
    }
  }, [checkScroll])

  return (
    <div
      ref={containerRef}
      className={clsx(
        'ScrollableShadows',
        hideShadows && 'ScrollableShadows--hide-shadows',
        hideScrollbars && 'ScrollableShadows--hide-scrollbars',
        className
      )}
      style={style}
      {...(overflows.xStart ? { 'data-overflow-x-start': '' } : {})}
      {...(overflows.xEnd ? { 'data-overflow-x-end': '' } : {})}
      {...(overflows.yStart ? { 'data-overflow-y-start': '' } : {})}
      {...(overflows.yEnd ? { 'data-overflow-y-end': '' } : {})}
    >
      <div
        ref={innerRef}
        className={clsx('ScrollableShadows__inner', innerClassName)}
        style={{
          overflowX: direction === 'horizontal' || direction === 'both' ? 'auto' : 'hidden',
          overflowY: direction === 'vertical' || direction === 'both' ? 'auto' : 'hidden',
        }}
      >
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
