## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## $(date +%Y-%m-%d) - Add ARIA label to NotificationCenter close button
**Learning:** Found a pattern where icon-only buttons (like `IconX` in notification center) are missing `aria-label` attributes, making them inaccessible to screen readers.
**Action:** Always verify that `<button>` elements that only contain an SVG icon include an explicit `aria-label` describing the button's action.
