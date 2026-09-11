/**
 * Slim notebook CSS (LemonTable + MarkdownNotebook). Not the full Lemon kit.
 * Scope class belongs only on the table wrapper and the editor surface.
 */

import { NOTEBOOK_PRODUCT_CSS } from '../../notebook-app/styles/productBundleCss'

const STYLE_ID = 'notebook-product-styles'
export const NOTEBOOK_PRODUCT_SCOPE_CLASS = 'notebook-app-scope'

/** Unlayered so it beats `.notebook-app-scope * { border: 0 }` from product preflight. */
const NOTEBOOK_TAG_CSS = `
.notebook-sync-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.375rem;
  font-weight: 400;
  line-height: 1;
  color: #1d4ed8 !important;
  text-decoration: none;
  background: rgba(29, 78, 216, 0.1) !important;
  border: 1px solid #1d4ed8 !important;
  border-radius: 4px;
}
.notebook-sync-tag--sm { font-size: 0.875rem; }
.notebook-sync-tag--xs { font-size: 0.75rem; }
.notebook-sync-tag--error {
  color: #dc2626 !important;
  background: rgba(220, 38, 38, 0.1) !important;
  border-color: #dc2626 !important;
}
.notebook-native-field {
  background-color: rgb(var(--bg, 255 255 255)) !important;
  color: rgb(var(--text-primary, 17 17 17));
}
.notebook-app-scope,
.Popover,
.LemonModal,
.LemonPopover,
.ReactModal__Content,
[data-lemon-popover] {
  --primary: #1d4ed8;
  --primary-foreground: #ffffff;
  --primary-rgb: 29, 78, 216;
  --z-popover: 1060;
}
.MarkdownNotebook__canvas > .MarkdownNotebook__text-group:not(:focus-within):not(:has(.MarkdownNotebook__row--insert-menu-open)) {
  content-visibility: auto;
  contain-intrinsic-size: auto 8rem;
}
.MarkdownNotebook__canvas > .MarkdownNotebook__row:not(:focus-within):not(.MarkdownNotebook__row--ai-prompt):not(.MarkdownNotebook__row--insert-menu-open) {
  content-visibility: auto;
  contain-intrinsic-size: auto 4.5rem;
}
.MarkdownNotebook__text-group:focus-within,
.MarkdownNotebook__text-group:has(.MarkdownNotebook__row--insert-menu-open),
.MarkdownNotebook__row--insert-menu-open {
  content-visibility: visible;
}
.MarkdownNotebook__insert-menu {
  z-index: calc(var(--z-popover, 1060) + 1);
}
.MarkdownNotebook__row--find-match {
  outline: 2px solid rgba(29, 78, 216, 0.55);
  outline-offset: 2px;
  border-radius: 10px;
}
.MarkdownNotebook__find-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.65rem;
  margin: 0 0 0.5rem;
  background: rgb(var(--bg, 255 255 255) / 0.92);
  border: 1px solid rgb(var(--border, 0 0 0) / 0.12);
  border-radius: 12px;
  backdrop-filter: blur(16px);
}
.MarkdownNotebook__find-input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  outline: none;
}
.MarkdownNotebook__find-count {
  font-size: 0.75rem;
  color: rgb(var(--text-muted, 100 100 100));
  white-space: nowrap;
}
.MarkdownNotebook__find-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.MarkdownNotebook__find-btn:hover {
  background: rgb(var(--bg-accent, 0 0 0) / 0.06);
}
@media print {
  .MarkdownNotebook__text-group,
  .MarkdownNotebook__row,
  .MarkdownNotebook__canvas > .MarkdownNotebook__text-group,
  .MarkdownNotebook__canvas > .MarkdownNotebook__row {
    content-visibility: visible !important;
  }
  .MarkdownNotebook__find-bar,
  .MarkdownNotebook__insert-menu,
  .MarkdownNotebook__format-toolbar,
  .MarkdownNotebook__invite-picker,
  .notebook-outline,
  [data-sidebar-label] {
    display: none !important;
  }
}
`

let injectCount = 0

export function ensureNotebookProductStyles(): void {
    if (typeof document === 'undefined') return
    injectCount += 1
    const css = `${NOTEBOOK_PRODUCT_CSS}\n${NOTEBOOK_TAG_CSS}`
    const existing = document.getElementById(STYLE_ID)
    if (existing instanceof HTMLStyleElement) {
        if (existing.innerHTML !== css) existing.innerHTML = css
        return
    }
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.setAttribute('data-notebook-product', 'true')
    style.innerHTML = css
    document.head.appendChild(style)
}

export function releaseNotebookProductStyles(): void {
    if (typeof document === 'undefined') return
    injectCount = Math.max(0, injectCount - 1)
}
