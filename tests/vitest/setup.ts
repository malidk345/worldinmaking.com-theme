/**
 * Vitest setup shared by every test file.
 * - jest-dom matchers (toBeInTheDocument, …) for the React component tests.
 * - `jest` → `vi`: the notebook-app tests were written for Jest (jest.fn, jest.useFakeTimers);
 *   Vitest's `vi` implements the same API.
 * - Element.getAnimations: missing in jsdom 16; LemonButton cancels animations on unmount.
 */
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

;(globalThis as unknown as { jest: typeof vi }).jest = vi

if (typeof Element !== 'undefined' && !('getAnimations' in Element.prototype)) {
    Object.defineProperty(Element.prototype, 'getAnimations', { value: () => [], configurable: true, writable: true })
}
