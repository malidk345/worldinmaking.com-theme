## 2024-05-23 - Default Data Over-fetching
**Learning:** The `usePosts` hook was fetching all columns (including heavy markdown `content`) by default, causing performance issues on list views. Supabase `select('*')` is costly for large text fields.
**Action:** Default to fetching only metadata columns in hooks. Use a specific option `{ fetchContent: true }` when full content is required (e.g., search, single post view). Always construct SWR/query keys to distinguish between partial and full data to avoid cache pollution.
