import React from 'react'
import type { ArtifactType } from '../types'
import { getRenderer } from '../../../lib/artifacts'

export function ArtifactBuildingPreview({
  type,
  title,
  error,
}: {
  type: ArtifactType
  title: string
  error?: string
}): JSX.Element {
  const label = type === 'html' || type === 'code' ? '' : getRenderer(type).label
  const heading = [label && `Building ${label}`, title && title !== 'Untitled' ? title : '']
    .filter(Boolean)
    .join(': ') || 'Building…'
  if (error) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary px-6 text-center"
        role="alert"
      >
        <p className="m-0 text-[13px] font-medium text-primary">{label ? `Could not build ${label}` : 'Could not build'}</p>
        <p className="m-0 max-w-sm text-[12px] text-muted">{error}</p>
      </div>
    )
  }

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-primary px-6 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {type === 'canvas' ? (
        <div className="relative h-24 w-40">
          <span className="absolute left-2 top-3 h-8 w-16 animate-pulse rounded border border-primary/40 bg-accent" />
          <span className="absolute right-1 top-8 h-8 w-16 animate-pulse rounded border border-primary/40 bg-accent [animation-delay:120ms]" />
          <span className="absolute bottom-1 left-10 h-8 w-16 animate-pulse rounded border border-primary/40 bg-accent [animation-delay:240ms]" />
        </div>
      ) : type === 'model3d' ? (
        <div className="h-20 w-20 animate-pulse rounded-md border border-primary/40 bg-accent [transform:rotateX(12deg)_rotateY(-18deg)]" />
      ) : (
        <div className="h-16 w-36 animate-pulse rounded-md border border-primary/40 bg-accent" />
      )}
      <p className="m-0 text-[13px] text-secondary">{heading}</p>
      <p className="m-0 text-[11.5px] text-muted">Preview replaces this view when ready.</p>
    </div>
  )
}
