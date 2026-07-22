## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.

## 2024-07-23 - [Add ARIA labels to icon-only OSButton components]
**Learning:** `OSButton` is frequently used for dense, icon-only toolbars and navigation components in the custom OS UI. While `Tooltip` provides visual context on hover, it doesn't provide accessibility context.
**Action:** Always verify that icon-only instances of `OSButton`, `LemonButton`, or native `<button>` have an explicit `aria-label` set so screen readers can interpret them correctly. Relying solely on a `Tooltip` or a `title` is insufficient.
