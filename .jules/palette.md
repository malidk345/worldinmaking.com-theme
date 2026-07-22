## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2024-05-18 - Refactoring Posts Gallery to LemonUI Table
**Learning:** Replaced the legacy card grid layout in the `/posts` route with a `LemonTable` component as requested to match the `posthog-ui-gallery` aesthetic. Removing explicit `key` attributes from `LemonTable` columns was required to satisfy the `Column<T>` type definition during production build (`pnpm run pages:build`).
**Action:** Always verify `Column<T>` type expectations for custom table components and avoid manually passing `key` when the generic type infers or forbids it.
