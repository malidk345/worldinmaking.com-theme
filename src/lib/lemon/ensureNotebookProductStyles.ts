/**
 * Slim notebook CSS (LemonTable + MarkdownNotebook). Not the full Lemon kit.
 * Scope class belongs only on the table wrapper and the editor surface.
 */

import { NOTEBOOK_PRODUCT_CSS } from '../../notebook-app/styles/productBundleCss'

const STYLE_ID = 'notebook-product-styles'
export const NOTEBOOK_PRODUCT_SCOPE_CLASS = 'notebook-app-scope'

let injectCount = 0

export function ensureNotebookProductStyles(): void {
    if (typeof document === 'undefined') return
    injectCount += 1
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.setAttribute('data-notebook-product', 'true')
    style.innerHTML = NOTEBOOK_PRODUCT_CSS
    document.head.appendChild(style)
}

export function releaseNotebookProductStyles(): void {
    if (typeof document === 'undefined') return
    injectCount = Math.max(0, injectCount - 1)
}
