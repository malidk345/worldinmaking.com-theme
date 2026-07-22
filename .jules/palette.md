## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.

## 2024-05-18 - [Ensure icon-only buttons have aria-labels]
**Learning:** Icon-only `<button>` elements (such as custom toolbar components for rich text editors or close/action buttons in side panels) are often inaccessible to screen readers without an explicit `aria-label`. Relying entirely on visual context or standard tooltip `title` properties is not enough for proper keyboard/screen reader accessibility. This pattern appeared in dynamically generated toolbar configurations mapping over icon components, as well as standalone interface controls.
**Action:** Always add an `aria-label` attribute corresponding to the purpose or `title`/`tooltip` content on icon-only buttons to guarantee screen-reader accessibility.
