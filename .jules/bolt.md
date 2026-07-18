## 2024-05-18 - [Optimizing sorting in ForumPageLayout]
**Learning:** Found O(N log N) performance bottleneck where `new Date(a.createdAt).getTime()` is repeatedly instantiated inside the `sort` callback of `useMemo` in `components/Forum/ForumPageLayout.tsx`. `sort` evaluates the same date multiple times during its comparisons, scaling up poorly.
**Action:** Extract expensive date parsing to a cached Map or Record before sorting, or pre-calculate these values once per re-render, ensuring sorting only does numerical comparison. O(N*M) reduces to O(N+M).
