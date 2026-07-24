## 2024-05-18 - Date Instantiations Inside Render and Sort Loops
**Learning:** React components (like the `PostsView` memoized context) and frontend utilities (like `usePosts`) often loop over items and sort them by date. Calculating `.getTime()` or `unix()` from strings using new `Date()` or `dayjs()` inside the comparison function of `.sort((a,b) => ...)` results in `$O(N \log N)$` redundant date instantiations per item. In large data arrays, this degrades client-side sorting and blocking time.
**Action:** Always pre-calculate dates inside an initial `.map()` traversal ($O(N)$) before applying `.sort()`, utilizing the Schwartzian transform: `.map(item => ({ item, time: dayjs(item.timestamp).unix() })).sort(...).map(m => m.item)`. I applied this optimization successfully in `PostsView`, `usePosts`, and `NotificationCenter`.

## 2024-07-24 - Optimize Date sorting in active forum topics route
**Learning:** Found an O(N log N) `Date` instantiation issue inside a `.sort()` array method in a backend route (`app/api/forum/topics/active/route.ts`).
**Action:** Replaced `new Date(string).getTime()` with lexicographical string comparisons (`a < b ? -1 : 1`) since Supabase returns ISO 8601 formatted date strings. This avoids parsing Date objects during sort loops.
