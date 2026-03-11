# WorldInMaking Codebase Audit & Refactoring Roadmap

This document outlines our step-by-step plan to thoroughly scan, clean, and optimize the entire codebase. 

**STRICT DIRECTIVE:** No changes made during any phase of this roadmap will alter the visual frontend, layout, spacing, or styling of the application. 

## Phase 1: Static Analysis & TypeScript/ESLint Cleanup
*Target: Identify and fix easily recognizable code defects.*
- [x] Run a comprehensive Next.js build / ESLint scan.
- [x] Resolve all `unused-vars`, `no-explicit-any`, and `ts-expect-error` issues.
- [x] Remove unused `import` statements across all components and pages.
- [x] Consolidate duplicated types and interfaces into dedicated definition files.

## Phase 2: Dead Code & Unused File Elimination
*Target: Reduce bundle size and developer cognitive load by removing ghost code.*
- [x] Scan for components and utility functions that are defined but never used.
- [x] Delete orphaned files, obsolete components, and legacy scripts that are no longer part of the routing or UI hierarchy.
- [x] Detect and remove redundant CSS variables or styles that aren't tied to any frontend class.

- [x] **Phase 3: Backend & Data-Fetching Optimization (Supabase)**
    - [x] Audit all `supabase.from()` calls; combined update/select to reduce round-trips in `useAdminData`.
    - [x] Review Realtime subscriptions (verified cleanup in `useCommunity`).
    - [x] Verify SQL schema consistency and secure RLS policies (verified in `schema.sql`).
    - [!] *Note: Rolled back some file deletions and PublicProfile logic to preserve original production styling.*
- [x] **Phase 4: Performance & Logic refinement**
    - [x] Audit React component re-renders; implement `useMemo`/`useCallback` & `React.memo` (memoized `WindowRouter`, `MenuBar`, `PostsView`, `ForumQuestionsTable`).
    - [x] Optimize window movement/resize smoothness by implementing local state for resizing to avoid global context updates during interaction.
    - [x] Simplify component logic without affecting visual output.

- [x] **Phase 5: Dependency & Final Review**
    - [x] Re-check `package.json` for actually unused dependencies (removed 16+ unused packages).
    - [x] Final project cleanup and documentation.

## Phase 6: Future Improvements Documentation
- [x] Documented architectural recommendations in `future_improvements.md`.
- [x] Created `optimization_report.md` summarizing the technical debt resolved.

---
**Current Status:** Codebase Audit & Optimization cycle completed successfully. Frontend styling preserved, performance improved, and dead code eliminated.
