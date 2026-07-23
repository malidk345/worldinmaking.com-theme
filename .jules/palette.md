## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2024-07-23 - Accessibility of Icon-Only Close Buttons
**Learning:** Icon-only close buttons lacking aria-labels make the interface inaccessible for screen readers in components like NotificationCenter and the Forum Mentions popup. The lack of visual label text causes the button's action to be unclear.
**Action:** Always add an `aria-label` attribute (e.g. `aria-label="Close notifications"`) to interactive elements containing only icons to provide adequate context to all users.
