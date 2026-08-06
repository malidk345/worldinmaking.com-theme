/**
 * Ambient types for `@cloudflare/next-on-pages`.
 * Package ships types via `exports`, but this repo uses classic `moduleResolution: "node"`,
 * which does not always resolve package `exports.types` — keep a minimal shim for the shell allowlist.
 */
declare module '@cloudflare/next-on-pages' {
    export interface CloudflareRequestContext {
        env?: Record<string, string | undefined>
        [key: string]: unknown
    }

    export function getRequestContext(): CloudflareRequestContext
    export function getOptionalRequestContext(): CloudflareRequestContext | undefined
}
