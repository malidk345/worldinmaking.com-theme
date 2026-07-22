## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2024-06-25 - ARIA Labels for Mapped Rich Text Toolbar Buttons
**Learning:** When dynamically mapping toolbar buttons for the rich text editor (`components/Forum/ForumRichText.tsx`), relying on the `title` attribute for tooltips does not provide adequate accessibility context for screen readers. The mapped data structure (e.g., `button.tooltipContent`) must be explicitly passed to `aria-label` as well.
**Action:** Always verify that mapped, icon-only `<button>` loops include an explicit `aria-label={button.tooltipContent}` mapping instead of just relying on the visual title prop.
