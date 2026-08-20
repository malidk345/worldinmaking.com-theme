## 2024-11-20 - Memoizing the Customers Array in useCustomers
**Learning:** In the `useCustomers` hook, computing the large `customers` map on every render using an inner `.find()` array lookup created an $O(N \times M)$ rendering bottleneck, which cascaded re-renders down to dependent components like `Customer`. Pre-computing an $O(1)$ lookup Map and wrapping the operation in `useMemo` significantly reduces CPU pressure during React re-renders.
**Action:** When working with large sets of static or semi-static data (like `CUSTOMER_DATA`) joined against dynamic contexts (like `useProducts`), always precompute secondary maps for $O(1)$ lookups and wrap the final merged structure in `useMemo` to prevent deep performance regressions.

## 2024-11-20 - Array Flattening in SWR Infinite Hooks
**Learning:** Using `reduce` combined with array spread syntax (`[...acc, ...cur]`) for array flattening inside SWR Infinite hooks creates an O(N^2) rendering bottleneck due to redundant array allocations on each iteration.
**Action:** Always use the single-pass `flatMap()` (or `flat()`) method to combine paginated array data, ensuring O(N) allocation time and avoiding main thread blocking.
## 2024-08-08 - [O(N) object manipulation over O(N^2)]
**Learning:** Performance best practice for React hooks: If a component processes static data (e.g., mapping or sorting a static configuration object like `FEATURE_DATA`), move this computation completely outside the hook to a module-level constant. This ensures the O(N) operation executes exactly once per module load rather than repeatedly on every render or component instance. Also avoid using object spread (`...acc`) inside `reduce` loops to build objects (e.g., `Object.entries(data).reduce(...)`), as it causes O(N^2) time complexity and memory churn. Instead, use single-pass O(N) methods like `Object.fromEntries(Object.entries(data).map(...))`.
**Action:** Move feature data mapping into a module-level constant in `src/hooks/useFeatureOwnership.tsx` and refactor it to avoid O(N^2) operations during build to optimize performance.

## 2024-05-18 - Avoid O(N^2) reduce for object construction
**Learning:** Using `reduce` with object spread (`...acc`) to build objects dynamically from an array of entries causes O(N^2) time complexity and excessive memory churn, which can noticeably impact performance on large datasets.
**Action:** Always replace this pattern with `Object.fromEntries(Object.entries(data).map(...))` for a single-pass O(N) operation.

## 2024-12-04 - Memoizing Array Aggregations
**Learning:** In the `Places` component (`src/pages/places/index.tsx`), computing the `placesByType` map using `places.reduce` without `useMemo` forces the JavaScript engine to perform an O(N) array traversal and allocate a new object on every render. For components with frequent state updates (like toggling map layers or selecting places), this introduces unnecessary main thread overhead and garbage collection pressure.
**Action:** Always wrap array aggregations (like `.reduce` or `Object.fromEntries`) in `useMemo` when they depend on props or state arrays that change infrequently, especially in components that re-render often due to internal state changes.

## 2024-12-06 - Optimizing useState Initializations and Array-as-Object Anti-pattern
**Learning:** Using a complex computation like `reduce` directly as a parameter inside `useState()` will cause the calculation to execute on every single render, even though the state is only initialized once. Also, using an empty array `[]` as an accumulator and assigning non-numeric string keys to it forces the JS engine (like V8) into "dictionary mode", breaking array optimization.
**Action:** Always wrap complex `useState` initializers in a lazy initializer function `useState(() => ...)` and always use an object `{}` (not an array `[]`) when accumulating string keys.
