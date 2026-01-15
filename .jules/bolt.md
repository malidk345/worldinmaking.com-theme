## 2024-05-23 - [Supabase Data Fetching Optimization]
**Learning:** The `usePosts` hook was fetching the full `content` field for all posts on every render, even for list views where content is not displayed. This causes significant network overhead and memory usage as the number of posts grows.
**Action:** Implemented conditional field selection in `usePosts` using a `fetchContent` option. Defaults to `false` to ensure list views remain lightweight. Only components that specifically need content (like Search or detailed views) should request it.
