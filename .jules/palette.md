## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.

## 2024-05-18 - Missing ARIA Labels in Dynamic Toolbar Icon Buttons
**Learning:** When toolbars dynamically generate icon-only buttons via mapping (e.g., in a rich text editor), `aria-label`s are often overlooked in favor of just a `title` tooltip. Tooltips alone don't provide sufficient context to screen readers, causing accessibility gaps for dynamically rendered controls.
**Action:** Always ensure mapped UI components include explicitly passed `aria-label` strings (such as `aria-label={button.tooltipContent}`) in addition to tooltips. Provide descriptive ARIA labels to close/dismiss buttons in modal or popover wrappers to prevent trapped keyboard states.
