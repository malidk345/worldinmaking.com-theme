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
