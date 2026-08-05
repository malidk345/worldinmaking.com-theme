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
const PALETTE_STYLE_ID = 'notebook-app-palette-bridge'
export const LEMON_SCOPE_CLASS = 'notebook-app-scope'

/**
 * WorldInMaking surface palette overrides for notebook islands.
 * Source SCSS (site-bridge / notebook-dark-panel) needs a full bundle rebuild;
 * this small inject always wins without regenerating the ~400KB NOTEBOOK_APP_CSS.
 */
const NOTEBOOK_PALETTE_CSS = `
.notebook-app-scope {
  --color-bg-surface-primary: #fdfdf8;
  --color-bg-surface-secondary: #eeefe9;
  --color-bg-surface-tertiary: #e5e7e0;
  --color-bg-surface-popover: #fdfdf8;
  --color-bg-fill-primary: #fdfdf8;
  --color-bg-fill-secondary: #eeefe9;
  --color-bg-fill-tertiary: #e5e7e0;
  --color-bg-fill-input: #eeefe9;
  --color-bg-fill-button-secondary: #eeefe9;
  --color-bg-fill-button-secondary-hover: #e5e7e0;
  --secondary-3000-button-border: #bfc1b7;
  --secondary-3000-button-border-hover: #a8aa9f;
  --secondary-3000-frame-bg: #e5e7e0;
  --border-3000: #bfc1b7;
  --border-bold-3000: #a8aa9f;
  --color-border-primary: #bfc1b7;
  --color-border-secondary: #a8aa9f;
  --shadow-elevation-3000: 0 10px 38px rgba(77, 79, 70, 0.18);
}
.notebook-app-scope.dark,
.notebook-app-scope .dark {
  --color-bg-surface-primary: #1e1f23;
  --color-bg-surface-secondary: #25262b;
  --color-bg-surface-tertiary: #2d2e37;
  --color-bg-surface-popover: #25262b;
  --color-bg-fill-primary: #1e1f23;
  --color-bg-fill-secondary: #25262b;
  --color-bg-fill-tertiary: #2d2e37;
  --color-bg-fill-input: #25262b;
  --color-bg-fill-button-secondary: #2d2e37;
  --color-bg-fill-button-secondary-hover: #32333d;
  --secondary-3000-button-border: #3e424f;
  --secondary-3000-button-border-hover: #4a4e5c;
  --secondary-3000-frame-bg: #2d2e37;
  --border-3000: #3e424f;
  --border-bold-3000: #4a4e5c;
  --color-border-primary: #3e424f;
  --color-border-secondary: #4a4e5c;
  --shadow-elevation-3000: 0 12px 40px rgba(0, 0, 0, 0.35);
}
.notebook-app-scope.Popover > .Popover__box {
  background: var(--color-bg-surface-popover) !important;
  border-color: var(--secondary-3000-button-border) !important;
}
`

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

    if (!document.getElementById(PALETTE_STYLE_ID)) {
        const palette = document.createElement('style')
        palette.id = PALETTE_STYLE_ID
        palette.setAttribute('data-lemon-ui-palette', 'true')
        palette.innerHTML = NOTEBOOK_PALETTE_CSS
        document.head.appendChild(palette)
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
