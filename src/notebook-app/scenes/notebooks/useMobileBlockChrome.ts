import { type RefObject } from 'react'

/**
 * Mobile block chrome is now managed directly and natively inside `MarkdownNotebook.tsx`.
 * The previous MutationObserver on document.body and duplicate touch listeners in this hook
 * caused an infinite microtask recursion loop on mobile devices, freezing the entire browser.
 */
export function useMobileBlockChrome(_rootRef?: RefObject<HTMLElement | null>): void {
    // No-op: Handled natively by MarkdownNotebook
}
