## 2024-03-24 - Accessibility improvements in TrendingWidget
**Learning:** Raw SVG icons and div list elements frequently lack keyboard focus indicators and handlers, making them completely inaccessible to keyboard users, even if they have `onClick` events.
**Action:** Always wrap interactive SVG icons in `<button>` tags when possible, or apply the full suite of `role="button"`, `aria-label`, `tabIndex`, and `onKeyDown` attributes when using raw SVGs or divs as buttons. Don't forget `focus-visible` styling for visual clarity.
