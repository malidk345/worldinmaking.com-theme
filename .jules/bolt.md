## 2024-11-20 - Memoizing the Customers Array in useCustomers
**Learning:** In the `useCustomers` hook, computing the large `customers` map on every render using an inner `.find()` array lookup created an $O(N \times M)$ rendering bottleneck, which cascaded re-renders down to dependent components like `Customer`. Pre-computing an $O(1)$ lookup Map and wrapping the operation in `useMemo` significantly reduces CPU pressure during React re-renders.
**Action:** When working with large sets of static or semi-static data (like `CUSTOMER_DATA`) joined against dynamic contexts (like `useProducts`), always precompute secondary maps for $O(1)$ lookups and wrap the final merged structure in `useMemo` to prevent deep performance regressions.

## 2024-11-20 - Replace O(N^2) array flatten with O(N) flatMap
**Learning:** Using `reduce` combined with array spread syntax (`[...acc, ...cur]`) to flatten paginated data from SWR Infinite hooks creates an O(N^2) operation. This causes significant main thread blocking during React renders as the dataset grows.
**Action:** Always use the native, O(N) `flatMap()` method (e.g., `data.flatMap((page) => page.data || [])`) instead of `reduce` with spread syntax for array flattening, especially inside `useMemo` hooks dealing with paginated API responses.
