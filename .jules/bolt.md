## 2024-10-24 - O(N*M) nested loops in render
**Learning:** Found an O(N*M) nested loop executing on every render in `ForumTopicSidebar.tsx` (filtering a posts array for every channel inside a map). It was also reinstantiating `Date` objects repeatedly during reduce.
**Action:** Look for `.filter()` or `.find()` inside `.map()` in React renders. Extract them into a `useMemo` using a `Map` or `Record` to optimize from O(N*M) down to O(N+M), especially when expensive object parsing (like `Date` or `dayjs`) is involved.
