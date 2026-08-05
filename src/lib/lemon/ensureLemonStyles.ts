/**
 * Full notebook Lemon UI CSS (scoped under `.notebook-app-scope`).
 *
 * Integration contract:
 * - Styles are injected once into <head>.
 * - Scope class is NOT applied to document.body (that leaked nested Tailwind base
 *   across the whole OS site). Scope lives only on:
 *     • <LemonScope> roots
 *     • Notebook App root
 *     • Portal roots (Popover / LemonModal already set `notebook-app-scope`)
 */

import { NOTEBOOK_APP_CSS } from '../../notebook-app/styles/bundleCss'

const STYLE_ID = 'notebook-app-styles'
export const LEMON_SCOPE_CLASS = 'notebook-app-scope'

let injectCount = 0

export function ensureLemonStyles(): void {
    if (typeof document === 'undefined') return

    injectCount += 1

    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.setAttribute('data-lemon-ui', 'true')
        style.innerHTML = NOTEBOOK_APP_CSS
        document.head.appendChild(style)
    }
}

/**
 * Ref-count release. CSS stays cached (parse is expensive ~400KB).
 * Does not touch body classes.
 */
export function releaseLemonStyles(): void {
    if (typeof document === 'undefined') return
    injectCount = Math.max(0, injectCount - 1)
}

export function isLemonStylesMounted(): boolean {
    return typeof document !== 'undefined' && !!document.getElementById(STYLE_ID)
}
