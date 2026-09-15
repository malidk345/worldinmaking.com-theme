export function findMatchingWindow<T extends { path: string }>(
  windows: T[],
  targetPath: string,
  matcher: (wPath: string, tPath: string) => boolean
): T | undefined {
  return windows.find((w) => matcher(w.path, targetPath));
}
