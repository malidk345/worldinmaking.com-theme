## 2024-03-24 - [Avoid Unrelated Changes that Break the Build]
**Learning:** While optimizing `useBreakpoint.ts`, I incorrectly attempted to refactor `timeoutMs` in an unrelated file (`src/lib/bots/tools/loop.ts`), which introduced syntax errors and failed the CI pipeline due to missing TypeScript variables and duplicate identifiers.
**Action:** Strictly limit performance optimizations to the single identified component or file described in the plan. Do not perform drive-by edits on unrelated code, especially complex architectures like AI tools, as this introduces regressions.
