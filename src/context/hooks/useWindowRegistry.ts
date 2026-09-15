// STUB: Window Registry Extract
//
// Blockers encountered during clean extraction:
// 1. Heavy entanglement between window state (`windows`, `windowsInView`) and AppUIState (panels, auth modals).
// 2. `addWindow` and layout functions tightly couple to `safePush`, `useAuthBridge` callbacks, and `siteSettings`.
// 3. Extracting without changing behavior requires passing ~30+ dependencies (refs, setters, and state)
//    back and forth between AppProvider and useWindowRegistry, which bloats the hook and risks stale closures.
export function useWindowRegistry() {
    // Parent is taking over this extract.
    return {}
}
