## 2024-05-23 - Data Fetching Optimization
**Learning:** The `usePosts` hook was fetching the full `content` column for all posts by default. This is a significant bottleneck for list views (Dashboard, Explore, etc.) as the content can be very large.
**Action:** Implemented a `fetchContent` option in `usePosts` (defaulting to `false`) to conditionally fetch the `content` column. List views should use the default (lightweight) fetch, while search and single post views can opt-in to the full content.
