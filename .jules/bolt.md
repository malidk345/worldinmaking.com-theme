## 2024-05-22 - Full Content Fetching in List Views
**Learning:** The `usePosts` hook was fetching the full markdown `content` column for every post, even when only displaying a list. This caused massive payload overhead.
**Action:** Always verify if `select('*')` is necessary. Use specific column selection for list views and opt-in for full content only when needed (e.g., search or detail views).
