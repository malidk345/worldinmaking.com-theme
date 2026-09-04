## Plan
1. Extract `visibleWindows`, `switcherIndex`, `missionControlLayout`, and `inSwitcher` into a new hook `useWindowSwitcher` in `src/hooks/useWindowSwitcher.ts`.
2. Extract `inView` calculation into a new hook `useWindowVisibility` in `src/hooks/useWindowVisibility.ts`.
3. Extract `toggleExpanded`, `handleDoubleClick`, `handleClose`, and `handleMouseDown` into a new hook `useWindowActions` in `src/hooks/useWindowActions.ts`.
4. Update `src/components/AppWindow/index.tsx` to import and use these new hooks, thereby reducing its size and encapsulating the logic.
5. Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
6. Commit and submit the changes.
