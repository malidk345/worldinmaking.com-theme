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
  /* Host Tailwind: border-primary → rgb(var(--border)).
     PostHog sets --border: rgb(0 0 0 / 15%) which makes rgb(var(--border))
     invalid CSS and paints a solid black frame on every border-primary.
     Do NOT set --bg here — that washes the list/editor to near-white. */
  --border: 192 192 192;
  --input-border: 210 210 210;
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
/* PostHog \`border-border\` is not a host utility — it fell through to currentColor (black). */
.notebook-app-scope .border-border {
  border-color: rgb(var(--border));
}
.notebook-app-scope .notebook-tools-sidebar {
  background: rgb(var(--bg));
  color: rgb(var(--text-primary));
  border-color: rgb(var(--border));
}
.notebook-app-scope .notebook-tools-footer {
  border-top: 1px solid rgb(var(--border));
}
.notebook-app-scope .notebook-tools-sidebar .notebook-rail-search input {
  background: rgb(var(--input-bg));
  border-color: rgb(var(--input-border));
  color: rgb(var(--text-primary));
}
.notebook-app-scope[data-notebook-font='sm'] .MarkdownNotebook { font-size: 0.875rem; }
.notebook-app-scope[data-notebook-font='md'] .MarkdownNotebook { font-size: 1rem; }
.notebook-app-scope[data-notebook-font='lg'] .MarkdownNotebook { font-size: 1.125rem; }
.notebook-app-scope .NotebookPublicView {
  /* Same stack as tailwind.config.js fontFamily.sans / blog ReaderView */
  --font-sans: 'RoundHog', -apple-system, BlinkMacSystemFont, 'avenir next', avenir, 'segoe ui', 'helvetica neue', helvetica, Ubuntu, roboto, noto, arial, sans-serif;
  --font-title: var(--font-sans);
  --font-button: var(--font-sans);
  --markdown-notebook-inline-control-width: 0px;
  --markdown-notebook-inline-control-gap: 0px;
  --markdown-notebook-content-offset: 0px;
  --color-text-primary: rgb(var(--text-primary));
  --text-3000: rgb(var(--text-primary));
  --tw-prose-body: rgb(var(--text-primary));
  --tw-prose-headings: rgb(var(--text-primary));
  --tw-prose-bold: rgb(var(--text-primary));
  --tw-prose-quotes: rgb(var(--text-primary));
  font-family: var(--font-sans);
  color: rgb(var(--text-primary));
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-group,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-block,
.notebook-app-scope .NotebookPublicView .prose {
  font-family: var(--font-sans);
  color: rgb(var(--text-primary));
  letter-spacing: normal !important;
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-group {
  font-size: 15px !important;
  line-height: 1.5 !important;
}
.notebook-app-scope[data-notebook-font='sm'] .NotebookPublicView .MarkdownNotebook,
.notebook-app-scope[data-notebook-font='md'] .NotebookPublicView .MarkdownNotebook,
.notebook-app-scope[data-notebook-font='lg'] .NotebookPublicView .MarkdownNotebook {
  font-size: 15px !important;
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-block {
  grid-column: 1;
  padding-left: 0;
  padding-right: 0;
  line-height: 1.5 !important;
  color: rgb(var(--text-primary)) !important;
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-row {
  grid-template-columns: minmax(0, 1fr);
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__canvas {
  max-width: none;
  margin: 0;
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__insert-boundary {
  height: 0;
  min-height: 0;
}
.notebook-app-scope .NotebookPublicView__article,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__main,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__canvas,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-group,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-row {
  margin-left: 0 !important;
  padding-left: 0 !important;
  max-width: none !important;
}
.notebook-app-scope .NotebookPublicView__title {
  font-family: var(--font-sans);
  color: rgb(var(--text-primary));
  font-size: 1rem !important;
  font-weight: 600 !important;
  line-height: 1.35 !important;
  letter-spacing: normal !important;
  margin: 0 0 0.75rem !important;
}
.notebook-app-scope .NotebookPublicView h2.MarkdownNotebook__text-block--heading {
  font-family: var(--font-sans);
  color: rgb(var(--text-primary));
  font-size: 1.4285714em !important;
  font-weight: 700 !important;
  line-height: 1.4 !important;
  letter-spacing: normal !important;
}
.notebook-app-scope .NotebookPublicView h3.MarkdownNotebook__text-block--heading {
  font-family: var(--font-sans);
  color: rgb(var(--text-primary));
  font-size: 1.2857143em !important;
  font-weight: 700 !important;
  line-height: 1.5555556 !important;
  letter-spacing: normal !important;
}
/* Portaled popovers may sit outside [data-scheme]; pin light/dark to host html class */
html.light .notebook-app-scope,
.light .notebook-app-scope:not(.dark) {
  --border: 192 192 192;
  --input-border: 210 210 210;
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
.notebook-app-scope.dark,
[data-notebook-host-theme='dark'] .notebook-app-scope,
[theme='dark'].notebook-app-scope {
  --border: 62 66 79;
  --input-border: 50 52 63;
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
  --bg-light: #232429;
  --bg-3000: #141518;
}

html.dark .MarkdownNotebook,
.dark .MarkdownNotebook,
[data-notebook-host-theme='dark'] .MarkdownNotebook,
[theme='dark'] .MarkdownNotebook {
  --markdown-notebook-component-background: var(--color-bg-surface-tertiary, #2a2b31);
  --markdown-notebook-component-border: var(--color-border-primary, #3e424f);
  --markdown-notebook-text-group-background: var(--color-bg-surface-tertiary, #2a2b31);
  --markdown-notebook-text-group-border: var(--color-border-primary, #3e424f);
  --markdown-notebook-text-group-shadow: inset 0 1px 0 rgb(255 255 255 / 5%);
  --markdown-notebook-code-background: var(--color-bg-surface-tertiary, #2a2b31);
  --markdown-notebook-code-border: var(--color-border-primary, #3e424f);
  --markdown-notebook-code-shadow: inset 0 1px 0 rgb(255 255 255 / 6%);
  --bg-light: var(--color-bg-surface-secondary, #232429);
}

html.dark .MarkdownNotebook__wim-block,
.dark .MarkdownNotebook__wim-block,
[data-notebook-host-theme='dark'] .MarkdownNotebook__wim-block {
  background: var(--color-bg-surface-primary, #1e1f23) !important;
}
.notebook-app-scope.Popover,
.Popover.notebook-app-scope,
.Popover {
  --z-popover: 999999 !important;
  z-index: 999999 !important;
}
.notebook-app-scope.Popover > .Popover__box,
.Popover.notebook-app-scope > .Popover__box {
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
  .notebook-app-scope .notebook-tools-sidebar,
  .notebook-app-scope .MarkdownNotebook__format-toolbar,
  .notebook-app-scope .MarkdownNotebook__insert-menu,
  .notebook-app-scope .MarkdownNotebook__invite-picker {
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

    const existingPalette = document.getElementById(PALETTE_STYLE_ID)
    if (existingPalette) {
        existingPalette.innerHTML = NOTEBOOK_PALETTE_CSS
    } else {
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
