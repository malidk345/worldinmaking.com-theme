## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.

## 2024-05-18 - Missing ARIA Labels on Rich Text Editor Toolbars
**Learning:** Found that dynamically rendered icon-only toolbar buttons (in ForumRichText and PostLexicalEditor) were using `title` for visual tooltips but lacked `aria-label`, making them poorly accessible for screen readers. This is a common pattern when iterating quickly on custom editors.
**Action:** Always ensure that icon-only interactive elements map their visual tooltip text to an `aria-label` attribute natively.
