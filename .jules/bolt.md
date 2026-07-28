## 2024-11-20 - Memoizing the Customers Array in useCustomers
**Learning:** In the `useCustomers` hook, computing the large `customers` map on every render using an inner `.find()` array lookup created an $O(N \times M)$ rendering bottleneck, which cascaded re-renders down to dependent components like `Customer`. Pre-computing an $O(1)$ lookup Map and wrapping the operation in `useMemo` significantly reduces CPU pressure during React re-renders.
**Action:** When working with large sets of static or semi-static data (like `CUSTOMER_DATA`) joined against dynamic contexts (like `useProducts`), always precompute secondary maps for $O(1)$ lookups and wrap the final merged structure in `useMemo` to prevent deep performance regressions.

## 2026-07-28 - Array flattening with reduce and spread
**Learning:** Using reduce with array spread syntax ([...acc, ...cur]) in paginated data hooks creates an O(N^2) memory reallocation loop, blocking the main thread when flattening large arrays of pages.
**Action:** Use the O(N) single-pass .flatMap() method to flatten array data safely without unnecessary memory spikes.
