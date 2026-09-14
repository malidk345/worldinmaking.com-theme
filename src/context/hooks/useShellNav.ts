import { useCallback, useEffect, useRef } from 'react'
import { isCancelledRouteError } from 'lib/swallow-cancelled-route'

export function useShellNav() {
    const routerRef = useRef<any>(null)

    useEffect(() => {
        // Capture router on client only to avoid SSR crash
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            routerRef.current = require('next/router').default
        } catch (e) {
            // ignore
        }
    }, [])

    const safePush = useCallback(
        (url: string, opts?: any) => {
            try {
                if (typeof window !== 'undefined') {
                    const next = new URL(url, window.location.origin)
                    if (next.pathname === window.location.pathname && next.search === window.location.search) {
                        return
                    }
                }
                const r = routerRef.current
                if (r && typeof r.push === 'function') {
                    const nav = r.push(url, undefined, opts)
                    if (nav && typeof nav.catch === 'function') {
                        nav.catch((err: unknown) => {
                            if (!isCancelledRouteError(err)) throw err
                        })
                    }
                } else if (typeof window !== 'undefined') {
                    window.location.href = url
                }
            } catch (e) {
                if (typeof window !== 'undefined') {
                    window.location.href = url
                }
            }
        },
        []
    )

    return { safePush }
}
