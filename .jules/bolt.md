## 2024-11-20 - Replace O(N²) array spread reduce with O(N) flatMap
**Learning:** Using `reduce` combined with array spread syntax (`[...acc, ...cur]`) for array flattening creates an O(N²) performance bottleneck, blocking the main thread during React renders. Using the single-pass `flatMap()` method resolves this to O(N).
**Action:** Always use `flatMap()` or `flat()` instead of `reduce` with array spread for flattening arrays, especially for large or paginated data sets like those from SWR Infinite hooks.

## 2026-08-01 - Avoid CI Configuration Bloat in Targeted PRs
**Learning:** Adding out-of-scope configuration changes (like `.markdownlint-cli2.jsonc`, `.codespellignore`, and Semgrep security fixes) to a targeted feature or performance PR will violate repository security boundaries and trigger rejection (even if those changes solve pre-existing CI failures).
**Action:** Strictly limit modifications to the source files relevant to the specific problem domain. Revert any accidental CI workflow or configuration edits before submission.
