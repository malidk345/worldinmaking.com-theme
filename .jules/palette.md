## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.

## 2024-05-19 - Accessible Mention Dialogs and Toolbar Buttons
**Learning:** Found a missing `aria-label` in the mention dialog's close button and dynamic toolbar buttons (`<button aria-label={button.tooltipContent} title={button.tooltipContent}>`) causing screen readers to misinterpret interactive elements. Adding descriptive labels improves accessibility for visually impaired users.
**Action:** Always verify icon-only buttons (`IconX`, etc.) have either explicit textual children or `aria-label` attributes.
