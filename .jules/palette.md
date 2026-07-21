## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.

## 2024-05-24 - Add ARIA Labels to custom Taskbar Icon-Only Buttons
**Learning:** In a codebase featuring custom button wrappers like `OSButton`, it's easy for developers to omit semantic `aria-label` attributes on icon-only interactive elements such as those typically found in a taskbar or navigation menu (e.g. search triggers, active windows panels, notification centers, and ambient players), relying heavily on visual cues.
**Action:** When working on navigation components or UI shells, actively check that all icon-only buttons pass explicit `aria-label` attributes down to their underlying DOM elements to ensure screen readers can provide context.
