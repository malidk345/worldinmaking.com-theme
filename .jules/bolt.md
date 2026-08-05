## 2024-11-20 - Memoizing the Customers Array in useCustomers
**Learning:** In the `useCustomers` hook, computing the large `customers` map on every render using an inner `.find()` array lookup created an $O(N \times M)$ rendering bottleneck, which cascaded re-renders down to dependent components like `Customer`. Pre-computing an $O(1)$ lookup Map and wrapping the operation in `useMemo` significantly reduces CPU pressure during React re-renders.
**Action:** When working with large sets of static or semi-static data (like `CUSTOMER_DATA`) joined against dynamic contexts (like `useProducts`), always precompute secondary maps for $O(1)$ lookups and wrap the final merged structure in `useMemo` to prevent deep performance regressions.

## 2024-11-20 - Array Flattening in SWR Infinite Hooks
**Learning:** Using `reduce` combined with array spread syntax (`[...acc, ...cur]`) for array flattening inside SWR Infinite hooks creates an O(N^2) rendering bottleneck due to redundant array allocations on each iteration.
**Action:** Always use the single-pass `flatMap()` (or `flat()`) method to combine paginated array data, ensuring O(N) allocation time and avoiding main thread blocking.
## 2024-05-17 - Replace O(N^2) array flattening with O(N) flatMap
**Learning:** Using `reduce` combined with array spread syntax (`[...acc, ...cur]`) to flatten arrays (especially large paginated datasets from SWR Infinite) leads to O(N^2) time complexity and can cause severe main thread blocking during React renders, as it creates a new array on every iteration.
**Action:** Always use the single-pass, O(N) native `flatMap()` or `flat()` methods when aggregating paginated data or flattening arrays in React `useMemo` hooks.
