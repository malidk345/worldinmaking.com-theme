export function resolveDiffApplySpanText(live: string, sticky: string | null): string {
  if (live && live.length >= 2) {
    return live;
  }
  if (sticky) {
    return sticky;
  }
  return '';
}
