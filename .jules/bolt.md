## 2024-05-23 - usePosts fetched heavy content by default
**Learning:** The `usePosts` hook was fetching `select('*')` including the `content` column (full markdown) for every post. This caused massive data transfer on list views (Home, Dashboard) where content is not needed.
**Action:** Always verify what columns are being selected in Supabase queries. Use specific column selection for list views and fetch full content only when necessary (e.g. single post view or search indexing).
