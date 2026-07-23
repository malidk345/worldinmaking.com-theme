## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2025-02-27 - Add aria-labels to icon-only formatting buttons in rich text editors
**Learning:** Tooltips using the `title` attribute are often insufficient for screen reader users when applied to icon-only buttons (like those found in `components/Forum/ForumRichText.tsx` and `components/Forum/PostLexicalEditor.tsx`). These buttons dynamically generated from configurations or hardcoded without text content need an explicit `aria-label` to be accessible.
**Action:** When creating or modifying toolbars with icon-only buttons, always ensure that an `aria-label` is provided, often derived from the same source as the `title` tooltip (e.g., `button.tooltipContent`), to maintain dual accessibility for both sighted and non-sighted users.
