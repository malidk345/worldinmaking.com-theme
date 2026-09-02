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

## 2025-02-23 - Memoizing Stage Computations & Static Menu Constants
**Learning:** Array filtering/sorting operations in render functions (such as `EarlyAccessFeaturesSection`) and inside custom hooks (such as `useEarlyAccessFeatures`) allocate new object/array references every render frame. Pre-computing lookup sets at module scope and wrapping array stage groupings in `useMemo` reduces CPU churn during React re-renders.
**Action:** Always extract static configuration objects/sets outside component scope and wrap non-trivial array filtering or grouping operations in `useMemo`.

## 2025-05-18 - System Prompt Capping Optimization in AI Gateway
**Learning:** Hard-truncating system prompts to 8,000 characters in `src/lib/bots/ai-gateway.ts` caused truncation of rich system context instructions during long multi-turn AI interactions. Increasing system prompt capacity to 12,000 characters provides adequate context window while retaining optimal token fitting logic across Groq and Gemini models.
**Action:** When configuring multi-provider AI gateway system prompt limits, ensure system prompt caps accommodate rich operational preambles and persona contexts without clipping critical tool definitions.

## 2025-05-19 - Avoid Reduce with Array Spread for Dynamic Layout Trees
**Learning:** Using `reduce` combined with array spread syntax (`[...sourceA, ...sourceB].reduce(...)`) for complex tree structure traversal creates redundant intermediate arrays and memory churn. When this pattern is used in deep or frequently executed layout parsers (like `injectDynamicChildren` for the App Context menu), it significantly increases main thread overhead and execution time.
**Action:** When aggregating multiple source arrays during layout construction or recursive rendering, use a direct `for...of` loop over each source array or a helper function instead of allocating intermediate flattened arrays to pass into `.reduce`.

## 2024-05-24 - [Avoid Array allocation for includes]
**Learning:** Using `array.map(x => x.id).includes(targetId)` creates an unnecessary intermediate array allocation which is O(N) memory and an O(N) pass for the map, followed by another O(N) pass for includes.
**Action:** Replace this pattern with `array.some(x => x.id === targetId)` which prevents the intermediate array allocation and can stop early on the first match.
