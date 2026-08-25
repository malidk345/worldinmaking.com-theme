import React from 'react'
import Zoom from 'react-medium-image-zoom'

export interface ZoomImageProps {
    children?: any
    noZoom?: boolean
    src?: string
    alt?: string
    title?: string
    caption?: string
    className?: string
    [key: string]: any
}

export const ZoomImage = ({ children, noZoom, ...other }: ZoomImageProps) => {
    // Extract caption from title, caption prop, alt, or child props
    const childProps = children && typeof children === 'object' && 'props' in children ? (children.props as Record<string, any>) : undefined
    const rawCaption =
        other.title ||
        other.caption ||
        other.alt ||
        childProps?.title ||
        childProps?.caption ||
        childProps?.alt ||
        ''

    // Filter out meaningless system placeholder strings or raw file paths
    const captionText =
        typeof rawCaption === 'string' &&
        rawCaption.trim().length > 0 &&
        !/^https?:\/\//i.test(rawCaption) &&
        !/^blob:/i.test(rawCaption) &&
        !/^(image|img|photo|picture|untitled)$/i.test(rawCaption.trim())
            ? rawCaption.trim()
            : null

    const imageElement = children || (
        <img
            className="rounded-lg max-w-full mx-auto shadow-sm"
            {...other}
        />
    )

    if (noZoom) {
        if (!captionText) return imageElement
        return (
            <figure className="my-4 block text-center max-w-full">
                {imageElement}
                <figcaption className="mt-2 text-center text-[13px] text-secondary/80 italic leading-relaxed font-sans select-text">
                    {captionText}
                </figcaption>
            </figure>
        )
    }

    return (
        <figure className="my-4 block text-center max-w-full">
            <span className="inline-block max-w-full">
                <Zoom
                    wrapElement="span"
                    overlayBgColorEnd="rgb(0 0 0 / 85%)"
                    overlayBgColorStart="transparent"
                    zoomMargin={12}
                >
                    {imageElement}
                </Zoom>
            </span>
            {captionText ? (
                <figcaption className="mt-2 text-center text-[13px] text-secondary/80 italic leading-relaxed font-sans select-text">
                    {captionText}
                </figcaption>
            ) : null}
        </figure>
    )
}

export default ZoomImage
