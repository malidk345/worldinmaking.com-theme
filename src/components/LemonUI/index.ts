/**
 * @deprecated Prefer `components/PostHogUI` or `@posthog/lemon-ui` + `LemonScope`.
 * This barrel now re-exports the full notebook Lemon UI so site code gets the real components.
 * Thin shim files in this folder are no longer the public API.
 */
export * from '../../notebook-app/lib/lemon-ui/index'
export { LemonScope } from '../LemonScope'
