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

## Phase 3: Backend & Data-Fetching Optimization (Supabase)
*Target: Improve query performance, eliminate redundant backend calls, and secure data flow.*
- [ ] Audit all `supabase.from()` calls in custom hooks and components.
- [ ] Ensure proper error handling and prevent memory leaks in `useEffect` fetch calls.
- [ ] Review Realtime subscriptions (if any) to ensure they are properly cleaned up on component unmount.
- [ ] Verify SQL schema consistency and secure remaining RLS (Row Level Security) policies without affecting frontend logic.

## Phase 4: React Performance & Re-render Optimization
*Target: Make the application flow "butter smooth" with optimal React mechanics.*
- [ ] Analyze expensive components and correctly implement `useMemo` and `useCallback` to prevent unnecessary re-renders.
- [ ] Ensure context providers (like `WindowContext`, `AuthContext`, `AppContext`) are optimized so context updates don't trigger cascading full-app re-renders.
- [ ] Audit React `useEffect` dependency arrays to prevent infinite loops and double-fetching.

## Phase 5: Dependency & Package Audit
*Target: Ensure the project dependencies are fast, modern, and conflict-free.*
- [ ] Check `package.json` for unused, duplicated, or overly heavy packages replacing them with native solutions if strictly necessary and non-visual.
- [ ] Remove overlapping libraries (e.g., multiple markdown parsers if they do the same job).

## Phase 6: Future Improvements Documentation
*Target: Create a strategic document of architectural recommendations.*
- [ ] Document potential backend infrastructure shifts, state management overhauls, and structural pattern changes for future reference.
- [ ] List any external services (like caching layers) that could optionally be added later.

---
**Current Status:** Ready to start Phase 1.
