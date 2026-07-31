## 2024-11-20 - Memoizing the Customers Array in useCustomers
**Learning:** In the `useCustomers` hook, computing the large `customers` map on every render using an inner `.find()` array lookup created an $O(N \times M)$ rendering bottleneck, which cascaded re-renders down to dependent components like `Customer`. Pre-computing an $O(1)$ lookup Map and wrapping the operation in `useMemo` significantly reduces CPU pressure during React re-renders.
**Action:** When working with large sets of static or semi-static data (like `CUSTOMER_DATA`) joined against dynamic contexts (like `useProducts`), always precompute secondary maps for $O(1)$ lookups and wrap the final merged structure in `useMemo` to prevent deep performance regressions.

## 2024-11-21 - Optimizing Array Flattening in SWR Infinite Hooks
**Learning:** Using `reduce` combined with array spread syntax (`[...acc, ...cur]`) to flatten paginated API responses from SWR Infinite hooks results in O(N²) memory allocation. As the `acc` array grows with each chunk of data, spreading it creates an entirely new array, heavily pressuring the garbage collector and blocking the main thread during React renders.
**Action:** Always use the native O(N) `flatMap()` method (e.g. `data.flatMap(cur => cur.data || [])`) or `flat()` to flatten paginated data arrays to avoid these unnecessary memory allocations and performance bottlenecks.
