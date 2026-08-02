## 2024-11-20 - Memoizing the Customers Array in useCustomers
**Learning:** In the `useCustomers` hook, computing the large `customers` map on every render using an inner `.find()` array lookup created an $O(N \times M)$ rendering bottleneck, which cascaded re-renders down to dependent components like `Customer`. Pre-computing an $O(1)$ lookup Map and wrapping the operation in `useMemo` significantly reduces CPU pressure during React re-renders.
**Action:** When working with large sets of static or semi-static data (like `CUSTOMER_DATA`) joined against dynamic contexts (like `useProducts`), always precompute secondary maps for $O(1)$ lookups and wrap the final merged structure in `useMemo` to prevent deep performance regressions.

## 2024-05-24 - [O(N²) Array Flattening in SWR Pagination]
**Learning:** Using `.reduce((acc, cur) => [...acc, ...cur.data], [])` inside `useMemo` hooks for SWR infinite pagination causes O(N²) main thread blocking. As users paginate, each page load iterates over all previous pages, spreading them into a new array, leading to memory thrashing and main thread pauses.
**Action:** Always use `.flatMap(cur => cur.data || [])` when combining paginated results. It's an O(N) single-pass operation optimized in the engine, eliminating the overhead of repeated array spreading.
