import React from 'react'
import { LocalPreviewIframe, type LocalPreviewProps } from './LocalPreviewIframe'

/**
 * Live React preview. The OS artifact window and the notebook share this path:
 * compile in the parent, render in a sandboxed iframe. Sandpack is not used on
 * the hot path — it failed inside the notebook scope (webpack + height chrome).
 */
export function ReactPreviewIframe(props: LocalPreviewProps) {
    return (
        <LocalPreviewIframe
            {...props}
            className={props.className || 'h-full w-full border-none bg-primary'}
        />
    )
}

export default ReactPreviewIframe
