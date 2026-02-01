## 2026-02-01 - [Oversized Data Fetching]
**Learning:** The `usePosts` hook was fetching `select('*')` by default, including full Markdown content for every post in list views. This caused unnecessary network payload and client-side parsing overhead in components like `HomeWindow` and `Dashboard`, which only display metadata and excerpts.
**Action:** Implemented a split-fetching strategy: `usePosts({ fetchContent: true })` for Search/Detail views, and a lightweight column selection for list views by default. Always audit `select('*')` in Supabase queries.
