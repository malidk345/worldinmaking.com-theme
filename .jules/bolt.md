## 2024-05-18 - Date Instantiations Inside Render and Sort Loops
**Learning:** React components (like the `PostsView` memoized context) and frontend utilities (like `usePosts`) often loop over items and sort them by date. Calculating `.getTime()` or `unix()` from strings using new `Date()` or `dayjs()` inside the comparison function of `.sort((a,b) => ...)` results in `$O(N \log N)$` redundant date instantiations per item. In large data arrays, this degrades client-side sorting and blocking time.
**Action:** Always pre-calculate dates inside an initial `.map()` traversal ($O(N)$) before applying `.sort()`, utilizing the Schwartzian transform: `.map(item => ({ item, time: dayjs(item.timestamp).unix() })).sort(...).map(m => m.item)`. I applied this optimization successfully in `PostsView`, `usePosts`, and `NotificationCenter`.

## 2024-05-18 - Missing useMemo and String Date Parsing
**Learning:** Found two frontend performance issues:
1.  `components/Forum/ForumTopicSidebar.tsx` was doing O(N) `new Date()` parsing on every render when calculating the last active date by using `.reduce()`. It's better to just compare the ISO strings directly, as ISO strings compare correctly alphabetically.
2.  `hooks/use-documents.ts` and `components/craft-editor/src/hooks/use-documents.ts` returned `sortedDocuments` by doing `[...documents].sort(...)` directly inside the hook body. This means on every single component render that used the hook (like the editor), the entire document array was copied and sorted.
**Action:** Always wrap derived sorted arrays in `useMemo`, and prefer direct string comparison for ISO dates to avoid expensive `new Date()` calls inside iteration loops.
