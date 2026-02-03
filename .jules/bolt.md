## 2024-05-22 - Supabase Over-fetching in Hooks
**Learning:** The `usePosts` hook was fetching `*` (all columns including heavy `content`) for every list view. This is a common anti-pattern in Supabase/BaaS apps where "select all" is the default.
**Action:** Default to fetching only metadata columns (`id`, `title`, `excerpt`, etc.) in list hooks. Explicitly opt-in to `fetchContent: true` only when necessary (e.g., search indexing, detail view).
