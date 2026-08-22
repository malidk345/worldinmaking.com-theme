/**
 * Next.js Pages Router rejects an in-flight `doRender` with
 * `Error: Cancel rendering route` when another navigation starts.
 * That is expected in the OS shell (overlapping window routes).
 * Dev overlay still treats the unhandled rejection as a crash unless
 * `push`/`replace` catch it.
 */

export function isCancelledRouteError(reason: unknown): boolean {
    if (!reason) return false
    if (typeof reason === 'object' && (reason as { cancelled?: boolean }).cancelled) return true
    const message =
        typeof reason === 'string'
            ? reason
            : reason instanceof Error
              ? reason.message
              : typeof reason === 'object' && reason && 'message' in reason
                ? String((reason as { message?: unknown }).message)
                : ''
    return /cancel(?:led)? render(?:ing)? route/i.test(message)
}

type NavFn = (...args: unknown[]) => unknown

function wrapNav(fn: NavFn): NavFn {
    return function (this: unknown, ...args: unknown[]) {
        const result = fn.apply(this, args)
        if (result && typeof (result as Promise<unknown>).then === 'function') {
            return (result as Promise<unknown>).catch((err) => {
                if (isCancelledRouteError(err)) return false
                throw err
            })
        }
        return result
    }
}

export function installCancelledRouteSwallow(): void {
    if (typeof window === 'undefined') return
    // Lazy so unit tests can import isCancelledRouteError without next/router.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Router } = require('next/router') as { Router: { prototype: { push: NavFn; replace: NavFn; __wimCancelPatched?: boolean } } }
    const proto = Router.prototype as {
        push: NavFn
        replace: NavFn
        __wimCancelPatched?: boolean
    }
    if (proto.__wimCancelPatched) return
    proto.__wimCancelPatched = true
    proto.push = wrapNav(proto.push)
    proto.replace = wrapNav(proto.replace)
}
