## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2024-05-18 - Missing ARIA labels and bug on pagination buttons
**Learning:** Found an accessibility issue where icon-only buttons in `TrendingWidget` were missing `aria-label`s. Also discovered a minor UX bug where clicking the "Previous page" button would reset the pagination to the first page (0) instead of going to the previous page (`prev - 1`).
**Action:** Always verify icon-only buttons have an `aria-label` and ensure pagination buttons correctly increment or decrement the current page instead of hardcoding a value like 0.
