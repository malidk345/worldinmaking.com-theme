## 2024-05-22 - Optimizing Post Fetching
**Learning:** The `usePosts` hook was fetching the full `content` (Markdown) for every post, even in list views (Dashboard, HomeWindow) where it wasn't needed. This caused unnecessary data transfer and processing.
**Action:** Implemented a `fetchContent` option in `usePosts` to conditionally select columns. Defaulted to `true` for safety, but opted-in to `false` in list components. When optimizing Supabase queries, ensure all columns required by the adapter/transformer (like `adaptPost`) are included in the selection list.
