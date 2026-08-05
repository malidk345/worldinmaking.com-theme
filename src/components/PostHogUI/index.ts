/**
 * Site-wide entry for notebook Lemon UI + scope wrapper.
 *
 * Prefer this (or `@posthog/lemon-ui` + `LemonScope`) for NEW UI surfaces.
 * Full Lemon components live under notebook-app; we re-export them here so
 * site code does not need deep notebook paths.
 */

export { LemonScope } from 'components/LemonScope'
export type { LemonScopeProps } from 'components/LemonScope'

export { LemonProvider } from 'components/LemonProvider'
export type { LemonProviderProps } from 'components/LemonProvider'

export { ensureLemonStyles, releaseLemonStyles, LEMON_SCOPE_CLASS } from 'lib/lemon/ensureLemonStyles'

// Full Lemon UI (same as notebook) — components are unchanged
export * from '../../notebook-app/lib/lemon-ui/index'
