## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.

## 2024-11-20 - [Add Keyboard Accessibility and ARIA labels to TrendingWidget]
**Learning:** Custom interactive elements (like icon-only "buttons" or clickable rows) frequently lack proper semantic roles, focusability (`tabIndex`), and keyboard event handlers (`onKeyDown` for 'Enter'/'Space'). In `TrendingWidget`, the refresh and pagination chevron icons, along with the list items, were inaccessible to keyboard and screen reader users.
**Action:** When applying interactive behaviors (`onClick`) to non-semantic elements (`<div>`, `<svg>`, etc.), always remember to pair them with `role="button"`, appropriate `aria-label`s, conditional `tabIndex`, keyboard activation handlers (`onKeyDown`), and clear `focus-visible` ring styles.
