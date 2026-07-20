## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2024-07-20 - [Add ARIA labels to icon-only buttons]
**Learning:** `NotificationCenter`'s close button lacked an `aria-label`, making it difficult for screen reader users to understand its function. Ensure all icon-only buttons have descriptive aria-labels.
**Action:** When creating icon-only buttons or reviewing them, always ensure an `aria-label` or visually hidden text is present to describe the action. Use the translation hook `t('common.close')` for localization if available.
