## 2024-05-23 - [Supabase Over-fetching]
**Learning:** `usePosts` was selecting `*` (full content) for list views, causing massive payload overhead.
**Action:** Optimized `usePosts` to default to metadata-only selection, requiring explicit `{ fetchContent: true }` for full content.
