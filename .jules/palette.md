## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2026-07-22 - Add Explicit aria-labels and titles to Icon-only Buttons
**Learning:** Icon-only buttons used for status indicators or actions (e.g., pending, error, download) must always include both an `aria-label` for screen readers and a `title` prop for sighted users. This is especially critical for disabled or loading states where the icon alone lacks sufficient context.
**Action:** When implementing or refactoring icon-only buttons (`LemonButton`, `button`, or `a`), verify that both `aria-label` and `title` (or `tooltip` if applicable via wrapped components) are explicitly defined. Do not rely solely on SVG titles or adjacent text if the button itself lacks semantic naming.
