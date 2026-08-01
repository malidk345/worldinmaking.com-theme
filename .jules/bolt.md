## 2024-11-20 - Memoizing the Customers Array in useCustomers
**Learning:** In the `useCustomers` hook, computing the large `customers` map on every render using an inner `.find()` array lookup created an $O(N \times M)$ rendering bottleneck, which cascaded re-renders down to dependent components like `Customer`. Pre-computing an $O(1)$ lookup Map and wrapping the operation in `useMemo` significantly reduces CPU pressure during React re-renders.
**Action:** When working with large sets of static or semi-static data (like `CUSTOMER_DATA`) joined against dynamic contexts (like `useProducts`), always precompute secondary maps for $O(1)$ lookups and wrap the final merged structure in `useMemo` to prevent deep performance regressions.

## 2024-11-20 - Flattening Paginated SWR Infinite Arrays
**Learning:** Using `reduce` combined with array spread syntax (`[...acc, ...cur]`) to flatten paginated results in SWR's `useSWRInfinite` creates a serious $O(N^2)$ memory allocation bottleneck. For each page loaded, the entire previous accumulated array is re-cloned, creating significant main-thread CPU pressure during React renders as list sizes grow.
**Action:** Always use the $O(N)$ single-pass `flatMap()` method (e.g. `data?.flatMap((cur) => cur.data || [])`) instead of `reduce` with array spreading for combining paginated API responses.
