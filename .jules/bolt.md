## 2024-05-22 - Full Content Fetching Bottleneck
**Learning:** The `usePosts` hook was fetching full content (`select('*')`) and processing it (heading extraction, word count) for every component, even those only displaying a list of cards. This caused unnecessary data transfer and CPU usage on the client.
**Action:** Implemented a `fetchContent` option in `usePosts` to selectively fetch only metadata fields when full content is not required. Applied this to Dashboard, Explore, and Blog Sidebar.
