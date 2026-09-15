export function resolveDiffApplySpanText(live: string, sticky: string | null): string {
  if (live && live.length >= 2) {
    return live;
  }
  if (sticky) {
    return sticky;
  }
  return '';
}

export type DiffApplyUiStatus = 'idle' | 'applied' | 'failed'

/** Button label for Diff Apply — idle / success / fail-closed. */
export function diffApplyButtonLabel(status: DiffApplyUiStatus): string {
  if (status === 'applied') return 'Applied ✓'
  if (status === 'failed') return "Couldn't apply"
  return 'Apply to document'
}

