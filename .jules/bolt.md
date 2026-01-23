## 2026-01-23 - [Supabase Partial Fetching]
**Learning:** Defaulting to `select('*')` in Supabase hooks causes massive over-fetching when tables have large columns (like `content`). This slows down list views significantly.
**Action:** Configure hooks (like `usePosts`) to fetch only necessary columns by default. Add an option (e.g., `{ fetchContent: true }`) to opt-in to full data fetching for specific views like Search or Single Post.
