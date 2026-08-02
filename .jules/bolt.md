## 2024-11-20 - Memoizing the Customers Array in useCustomers
**Learning:** In the `useCustomers` hook, computing the large `customers` map on every render using an inner `.find()` array lookup created an $O(N \times M)$ rendering bottleneck, which cascaded re-renders down to dependent components like `Customer`. Pre-computing an $O(1)$ lookup Map and wrapping the operation in `useMemo` significantly reduces CPU pressure during React re-renders.
**Action:** When working with large sets of static or semi-static data (like `CUSTOMER_DATA`) joined against dynamic contexts (like `useProducts`), always precompute secondary maps for $O(1)$ lookups and wrap the final merged structure in `useMemo` to prevent deep performance regressions.

## 2026-08-02 - Array flattening with reduce vs flatMap
**Learning:** Using `reduce` combined with array spread syntax (`[...acc, ...cur]`) for array flattening inside `useMemo` hooks (especially with SWR Infinite) creates an $O(N^2)$ operation that allocates intermediate arrays and blocks the main thread during React renders.
**Action:** Always use the $O(N)$ single-pass `flatMap()` or `flat()` methods instead of `reduce` for array flattening to prevent performance bottlenecks with large datasets.
