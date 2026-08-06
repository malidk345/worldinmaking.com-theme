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
 * Notebook surface bridge → host site colors from tailwind.config.js:
 *   light: #fff | accent-light: #e5e7e0 | dark: #1e1f23 | accent-dark: #232429
 * Prefer live scheme vars (rgb(var(--bg))) so skin/theme switches match the rest of the OS.
 * No invented cream/beige hexes.
 */
const NOTEBOOK_PALETTE_CSS = `
.notebook-app-scope {
  --color-bg-surface-primary: rgb(var(--bg, 255 255 255));
  --color-bg-surface-secondary: rgb(var(--accent, 229 231 224));
  --color-bg-surface-tertiary: rgb(var(--accent, 229 231 224));
  --color-bg-surface-popover: rgb(var(--bg, 255 255 255));
  --color-bg-fill-primary: rgb(var(--bg, 255 255 255));
  --color-bg-fill-secondary: rgb(var(--accent, 229 231 224));
  --color-bg-fill-tertiary: rgb(var(--accent, 229 231 224));
  --color-bg-fill-input: rgb(var(--input-bg, var(--accent, 238 239 233)));
  --color-bg-fill-button-secondary: rgb(var(--accent, 229 231 224));
  --color-bg-fill-button-secondary-hover: rgb(var(--accent, 229 231 224));
  --secondary-3000-button-border: rgb(var(--border, 191 193 183));
  --secondary-3000-button-border-hover: rgb(var(--border, 182 183 175));
  --secondary-3000-frame-bg: rgb(var(--accent, 229 231 224));
  --border-3000: rgb(var(--border, 191 193 183));
  --border-bold-3000: rgb(var(--border, 182 183 175));
  --color-border-primary: rgb(var(--border, 191 193 183));
  --color-border-secondary: rgb(var(--border, 182 183 175));
  --shadow-elevation-3000: 0 10px 38px rgba(0, 0, 0, 0.14);
  --color-text-primary: rgb(var(--text-primary, 17 17 17));
  --text-3000: rgb(var(--text-primary, 17 17 17));
}
/* Portaled popovers may sit outside [data-scheme]; pin light/dark to host html class */
html.light .notebook-app-scope,
.light .notebook-app-scope:not(.dark) {
  --color-bg-surface-primary: #ffffff;
  --color-bg-surface-secondary: #ffffff;
  --color-bg-surface-tertiary: #f5f5f5;
  --color-bg-surface-popover: #ffffff;
  --color-bg-fill-primary: #ffffff;
  --color-bg-fill-secondary: #f5f5f5;
  --color-bg-fill-tertiary: #f5f5f5;
  --color-bg-fill-input: #ffffff;
  --color-bg-fill-button-secondary: #f5f5f5;
  --color-bg-fill-button-secondary-hover: #eeeeee;
  --secondary-3000-button-border: #e0e0e0;
  --secondary-3000-button-border-hover: #cfcfcf;
  --secondary-3000-frame-bg: #f0f0f0;
  --border-3000: #e0e0e0;
  --border-bold-3000: #cfcfcf;
  --color-border-primary: #e0e0e0;
  --color-border-secondary: #cfcfcf;
}
html.dark .notebook-app-scope,
.dark .notebook-app-scope,
.notebook-app-scope.dark {
  --color-bg-surface-primary: #1e1f23;
  --color-bg-surface-secondary: #232429;
  --color-bg-surface-tertiary: #2a2b31;
  --color-bg-surface-popover: #1e1f23;
  --color-bg-fill-primary: #1e1f23;
  --color-bg-fill-secondary: #232429;
  --color-bg-fill-tertiary: #2a2b31;
  --color-bg-fill-input: #232429;
  --color-bg-fill-button-secondary: #232429;
  --color-bg-fill-button-secondary-hover: #2a2b31;
  --secondary-3000-button-border: #3e424f;
  --secondary-3000-button-border-hover: #4a4e5c;
  --secondary-3000-frame-bg: #232429;
  --border-3000: #3e424f;
  --border-bold-3000: #4a4e5c;
  --color-border-primary: #3e424f;
  --color-border-secondary: #4a4e5c;
  --color-text-primary: #fafafa;
  --text-3000: #fafafa;
  --shadow-elevation-3000: 0 12px 40px rgba(0, 0, 0, 0.35);
}
.notebook-app-scope.Popover > .Popover__box {
  background: var(--color-bg-surface-popover) !important;
  border-color: var(--secondary-3000-button-border) !important;
}
.notebook-app-scope .notebook-outline-flash {
  outline: 2px solid #1d4ed8;
  outline-offset: 4px;
  border-radius: 4px;
}
@media print {
  .notebook-app-scope .notebook-outline,
  .notebook-app-scope .MarkdownNotebook__format-toolbar,
  .notebook-app-scope .MarkdownNotebook__insert-menu {
    display: none !important;
  }
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
