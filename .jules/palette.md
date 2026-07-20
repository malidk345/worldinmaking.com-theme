## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2024-07-20 - [Add missing aria-labels to icon-only buttons]
**Learning:** Icon-only interactive elements like close buttons and clear input buttons frequently lack `aria-label` attributes. It's crucial for accessibility to provide a descriptive label for screen reader users, especially when the icon itself doesn't offer readable text. Furthermore, using `type="button"` ensures it's not accidentally treated as a submit button inside forms.
**Action:** When creating or modifying icon-only buttons, always check for `aria-label` or visually hidden text, and ensure the button has a defined `type`. Used `useTranslation` to map localized strings for the new `aria-label`s to support i18n properly.
