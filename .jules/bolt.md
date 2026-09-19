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

## 2025-05-19 - Avoid Reduce with Array Spread for Set and String structures
**Learning:** Using `reduce` combined with array spread syntax to iterate over Sets (`[...mySet].reduce(...)`) or Strings (`[...myString].reduce(...)`) creates redundant intermediate arrays and memory churn. When this pattern is used in deep or frequently executed parsers (like list indentation parsing or Markdown AST manipulations), it introduces unnecessary main thread overhead and execution time. A `for...of` loop is more performant as it operates on iterables without intermediate array allocations.
**Action:** When iterating over a String or Set to compute a value or filter elements, always use a direct `for...of` loop instead of spreading the iterable into an array to pass into `.reduce`.

## 2025-05-19 - Avoid un-memoized JSON.parse inside component renders
**Learning:** Performing array filtering with inner `JSON.parse` operations (such as resolving job posting custom fields) directly inside the React render function introduces an unnecessary O(N) performance bottleneck and memory allocations.
**Action:** Always wrap array filtering and data transformation loops in `useMemo` (especially when they contain expensive operations like `JSON.parse`) to ensure they only re-evaluate when their specific dependencies change.
## 2026-09-12 - [API Defenses]
**Learning:** Replaced unsafe `req.json()` calls with size-bounded `readJsonObject` on mutating endpoints to prevent payload exhaustion, and applied `checkRateLimitDurable` to public routes. Ensure `!parsed.ok` handles the 413 error status correctly when introducing `readJsonObject`.
**Action:** Enforce size constraints and rate limits natively on all new API route controllers.

## 2026-09-12 - Optimize notification refresh pipeline
**Learning:** Polling loops combined with focus listeners and panel-open effects can cause cascading redundant network requests. Supabase `auth.getSession()` inside fetchers is slow if the session is already known by the caller context.
**Action:** Unify multiple fetch triggers behind a single debounced sync function with `useRef` tracking the last fetch time. Pass known user IDs downward to avoid redundant session reads.

## 2024-05-30 - [Performance] Optimize url parameter serialization
**Learning:** `Object.entries().filter().reduce().map()` chains inside utility functions that run frequently (like URL param parsers used for fetch calls or routing) generate unnecessary intermediate arrays and O(N) memory churn.
**Action:** Replaced chained array methods with a single standard `for...in` loop and `.push()` in `toParams` to improve serialization performance by 60%+ and eliminate intermediate object allocations.
## 2026-09-14 - [Philosopher Cron Idempotency]
**Learning:** Implementing idempotency for webhook or cron endpoints that interact with slow third-party APIs (like LLMs) requires a lock that spans the maximum duration of the request, especially if the orchestrator retries aggressively on timeout. Using a GitHub Action `GITHUB_RUN_ID` as part of the lock key ensures that network retries of the *same* run are blocked, while a subsequent scheduled run can still proceed if the first one legitimately failed.
**Action:** When asked to implement idempotency for an Edge function orchestrated by GitHub Actions, generate a `runId` in the Action script and use a durable KV/RateLimit store on the Edge to gracefully skip redundant executions.
## 2026-09-14 - Optimize Object.keys().some() allocation in loops
**Learning:** Using `Object.keys(obj).some(...)` to check for key existence inside a render loop or array map allocates a redundant array of keys every iteration, causing significant O(N) memory churn and lookup overhead.
**Action:** Replace `Object.keys(obj).some(key => key === 'target')` with a direct O(1) property check using `Object.prototype.hasOwnProperty.call(obj, 'target')` to eliminate intermediate arrays and speed up execution.

## 2026-09-19 - Shallow comparison for breakpoint resize hooks
**Learning:** In hooks that listen to high-frequency events (like `resize` in `useBreakpoint`), setting a new object state on every tick will cause the consuming components to re-render even if the actual boolean values haven't changed.
**Action:** Use functional state updates (`setState(prev => ...)`) and explicitly compare the new values against the previous ones. Return the `prev` reference if they match, allowing React to bail out of rendering via `Object.is` equality. Also apply `{ passive: true }` to the event listener if `preventDefault()` is not needed.
