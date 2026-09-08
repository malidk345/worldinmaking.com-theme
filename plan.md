1. Add new custom hooks in `src/hooks/useWindowStyles.ts` (or similar name like `useWindowClasses.ts`) to encapsulate the complex class name and style objects inside `AppWindow`.
2. Extract the menu logic (`getActiveInternalMenu` and related local state) from `AppWindow` to `useWindowMenu.ts`.
3. Modify `src/components/AppWindow/index.tsx` to use the extracted `useWindowStyles` and `useWindowMenu`, dramatically cleaning up its structure.
4. Update `AppWindow` style and `useWindowPhysics` / `useWindowStyles` to fully adopt the "iOS 26" aesthetic described by the user:
   - Ultra-rounded corners (`rounded-[32px]` for outer window)
   - Multi-layered shadows and sub-pixel borders (`border border-white/80 dark:border-white/15`)
   - Higher blur/saturation backgrounds (`backdrop-blur-2xl bg-white/70 dark:bg-[#18191c]/70`)
   - Premium liquid glass transitions
5. Run tests (`pnpm run typecheck:shell`, `pnpm run build:notebook-styles` or UI tests) to ensure the AppWindow structure still works and no gating failures are hit.
6. Verify layout and aesthetics locally/via verification tool, and run pre-commit tests.
