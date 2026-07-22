## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2023-10-25 - Add ARIA labels to icon-only buttons
**Learning:** In custom OS components (like TaskBarMenu and NotificationCenter), icon-only interactive elements often lack ARIA labels because they use custom components (like OSButton) wrapping SVG icons instead of native elements. This pattern causes screen readers to have no context for these critical navigation buttons.
**Action:** Always verify that icon-only buttons in custom desktop or notification interfaces explicitly receive an `aria-label` attribute, even when using custom wrappers like `OSButton`. Check translations for appropriate aria-label keys if the component supports localization.
