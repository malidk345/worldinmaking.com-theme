import React, { useState } from 'react'
import type { WebCitation } from '../types'
import { citationFaviconUrl, citationInitial } from '../utils/citationMeta'

export const SourceFavicon: React.FC<{
  citation: WebCitation
  size?: number
  className?: string
}> = ({ citation, size = 20, className = '' }) => {
  const src = citationFaviconUrl(citation.url)
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-[#ececec] text-[#5a5a5a] font-medium leading-none ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.45)) }}
      >
        {citationInitial(citation)}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`rounded-full bg-white object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  )
}
