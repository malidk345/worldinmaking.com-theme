## 2024-11-20 - Memoizing the Customers Array in useCustomers
**Learning:** In the `useCustomers` hook, computing the large `customers` map on every render using an inner `.find()` array lookup created an $O(N \times M)$ rendering bottleneck, which cascaded re-renders down to dependent components like `Customer`. Pre-computing an $O(1)$ lookup Map and wrapping the operation in `useMemo` significantly reduces CPU pressure during React re-renders.
**Action:** When working with large sets of static or semi-static data (like `CUSTOMER_DATA`) joined against dynamic contexts (like `useProducts`), always precompute secondary maps for $O(1)$ lookups and wrap the final merged structure in `useMemo` to prevent deep performance regressions.

## 2024-11-20 - Replace reduce+spread with flatMap for array flattening
**Learning:** Using `reduce` in combination with the array spread syntax `[...acc, ...cur]` to flatten arrays (e.g. data returned from SWR paginated endpoints) results in $O(N^2)$ time complexity. This is because every iteration triggers array destructuring and memory allocation, which can cause significant main thread blocking and frame drops on large datasets.
**Action:** Always replace `reduce` with `[...acc, ...cur]` array flattening with the native, single-pass $O(N)$ `flatMap()` or `flat()` methods to improve performance, especially when paginating large sets of records.
