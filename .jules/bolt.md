## 2025-02-23 - Optimize Array Flattening
**Learning:** Found multiple instances where large or paginated data sets from SWR Infinite hooks were being flattened using `reduce` combined with array spread syntax (`[...acc, ...cur]`). This creates a new array on every iteration, leading to O(N^2) time complexity and significant memory allocation/garbage collection overhead, especially as the data sets grow.
**Action:** Replaced these inefficient `reduce` patterns with the native, O(N) single-pass `flatMap()` method to improve performance and prevent main thread blocking during React renders.
