## 2024-11-20 - Memoizing the Customers Array in useCustomers
**Learning:** In the `useCustomers` hook, computing the large `customers` map on every render using an inner `.find()` array lookup created an $O(N \times M)$ rendering bottleneck, which cascaded re-renders down to dependent components like `Customer`. Pre-computing an $O(1)$ lookup Map and wrapping the operation in `useMemo` significantly reduces CPU pressure during React re-renders.
**Action:** When working with large sets of static or semi-static data (like `CUSTOMER_DATA`) joined against dynamic contexts (like `useProducts`), always precompute secondary maps for $O(1)$ lookups and wrap the final merged structure in `useMemo` to prevent deep performance regressions.

## 2024-05-18 - Optimize useProduct hook
**Learning:** React hooks like `useProduct` returning large arrays containing objects populated from multiple sources can become a performance bottleneck if O(N^2) `.find()` operations are used in a mapping function within `useMemo`.
**Action:** Always pre-compute a lookup `Map` (O(1)) instead of calling `.find()` (O(N)) inside loops. Also extract static arrays out of the component to prevent recreating references on each render.
