import { stripPathNoise } from '../window-path'

/**
 * Find a desktop window for manage_windows close/focus/minimize.
 * Prefer an exact path match so closing `/notebooks/nb-2` never hits
 * `/notebooks/nb-1` first when the family matcher would treat them as equal.
 * Fall back to the caller matcher (typically `windowPathMatches`) for
 * list↔editor / assistant↔workspace-chat families.
 */
export function findMatchingWindow<T extends { path: string }>(
  windows: T[],
  targetPath: string,
  matcher: (wPath: string, tPath: string) => boolean
): T | undefined {
  const target = stripPathNoise(targetPath)
  const exact = windows.find((w) => stripPathNoise(w.path) === target)
  if (exact) return exact
  return windows.find((w) => matcher(w.path, targetPath))
}
