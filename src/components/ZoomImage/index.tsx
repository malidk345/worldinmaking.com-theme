import React from 'react'
import Zoom from 'react-medium-image-zoom'

export const ZoomImage = ({ children, noZoom, ...other }: { children: any }) => {
    return noZoom ? (
        <img {...other} />
    ) : (
        <span>
            <Zoom
                wrapElement="span"
                overlayBgColorEnd="rgb(0 0 0 / 85%)"
                overlayBgColorStart="transparent"
                zoomMargin={12}
            >
                {children || <img {...other} />}
            </Zoom>
        </span>
    )
}
