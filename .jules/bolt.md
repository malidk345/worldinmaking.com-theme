## 2024-11-20 - Memoizing the Customers Array in useCustomers
**Learning:** In the `useCustomers` hook, computing the large `customers` map on every render using an inner `.find()` array lookup created an $O(N \times M)$ rendering bottleneck, which cascaded re-renders down to dependent components like `Customer`. Pre-computing an $O(1)$ lookup Map and wrapping the operation in `useMemo` significantly reduces CPU pressure during React re-renders.
**Action:** When working with large sets of static or semi-static data (like `CUSTOMER_DATA`) joined against dynamic contexts (like `useProducts`), always precompute secondary maps for $O(1)$ lookups and wrap the final merged structure in `useMemo` to prevent deep performance regressions.

## 2024-11-20 - Array FlatMapping Optimization for Paginated APIs
**Learning:** Using `reduce` combined with array spread syntax (`[...acc, ...cur]`) to flatten paginated API results inside `useMemo` (e.g. SWR infinite hooks) operates in $O(N^2)$ time. This creates thousands of unnecessary intermediate arrays that must be garbage collected, leading to severe main thread blocking and memory spikes during React renders on large datasets.
**Action:** Always use the $O(N)$ single-pass `.flatMap()` (or `.flat()`) method to combine paginated API arrays in frontend state hooks instead of `.reduce()` with array spreading.
