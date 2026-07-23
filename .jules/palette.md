## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.

## 2026-07-23 - Notification Center Button Accessibility
**Learning:** Found a common pattern of missing `aria-label` and `title` attributes on icon-only buttons (`OSButton` and `<button>`) in the Notification Center. Screen reader users would have no context of these buttons' functions.
**Action:** When creating or modifying icon-only custom buttons or native buttons, ALWAYS ensure they have both `aria-label` (for screen readers) and `title` (for sighted users) attributes to provide context.
