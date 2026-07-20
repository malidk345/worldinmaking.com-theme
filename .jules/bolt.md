## 2024-05-18 - Date Instantiations Inside Render and Sort Loops
**Learning:** React components (like the `PostsView` memoized context) and frontend utilities (like `usePosts`) often loop over items and sort them by date. Calculating `.getTime()` or `unix()` from strings using new `Date()` or `dayjs()` inside the comparison function of `.sort((a,b) => ...)` results in `$O(N \log N)$` redundant date instantiations per item. In large data arrays, this degrades client-side sorting and blocking time.
**Action:** Always pre-calculate dates inside an initial `.map()` traversal ($O(N)$) before applying `.sort()`, utilizing the Schwartzian transform: `.map(item => ({ item, time: dayjs(item.timestamp).unix() })).sort(...).map(m => m.item)`. I applied this optimization successfully in `PostsView`, `usePosts`, and `NotificationCenter`.

## 2024-05-18 - ForumTopicSidebar Nested Date Iteration
**Learning:** Found a case in `ForumTopicSidebar.tsx` where `.reduce` and `Date` instantiation were being called $O(N)$ times *for each channel* $C$, resulting in $O(N \times C)$ expensive operations inside the component render logic.
**Action:** Transformed this into $O(N)$ mapping up-front utilizing `useMemo` to construct a `Map` relating `channelId` to `latestTime`. This enables an $O(1)$ lookup inside the loop, greatly minimizing re-render blocking times as the post list grows.
