## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2024-11-20 - Adding Accessibility Attributes to Icon-Only LemonButtons
**Learning:** Icon-only buttons used for navigation and actions within `LemonButton` lack both `aria-label` and `title` attributes by default unless explicitly provided. This creates a significant accessibility issue for screen readers which receive no context about the button's action.
**Action:** When auditing or implementing icon-only buttons, specifically look for `LemonButton` instances without text `children` and verify they explicitly pass `aria-label` and `title`.
