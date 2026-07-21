## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2024-05-24 - Add ARIA Labels to Icon-Only Buttons in OS UI
**Learning:** Icon-only buttons within the custom OS UI components (like `OSButton` in `NotificationCenter` and `TaskBarMenu`) lack context for screen readers. Since these buttons visually rely purely on icons (like a bell, user avatar, or search icon), they are entirely inaccessible to non-sighted users without an `aria-label`.
**Action:** When creating or updating icon-only interactive elements, especially those serving as custom navigation or window management actions (e.g., `OSButton`), always ensure they have an explicit `aria-label` attribute describing their function or state.
