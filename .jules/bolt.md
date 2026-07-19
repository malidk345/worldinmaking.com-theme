## 2024-05-18 - [Optimizing sorting in ForumPageLayout]
**Learning:** Found O(N log N) performance bottleneck where `new Date(a.createdAt).getTime()` is repeatedly instantiated inside the `sort` callback of `useMemo` in `components/Forum/ForumPageLayout.tsx`. `sort` evaluates the same date multiple times during its comparisons, scaling up poorly.
**Action:** Extract expensive date parsing to a cached Map or Record before sorting, or pre-calculate these values once per re-render, ensuring sorting only does numerical comparison. O(N*M) reduces to O(N+M).
## 2024-05-19 - [O(N log N) dayjs Parsing Bottleneck]
**Learning:** In `components/Posts/index.tsx`, `dayjs.utc().unix()` was executed inside the `.sort()` comparator callback. Because standard sorting algorithms execute comparators $O(N \log N)$ times, `dayjs` parses the same dates redundantly, which is a slow string parsing process inside the render cycle.
**Action:** Always utilize the Schwartzian transform (Decorate-Sort-Undecorate) when sorting by computationally expensive keys (like dates, or derived values) in React `useMemo` hooks. Map array to calculate sort keys once ($O(N)$), sort on the keys, and map back.
