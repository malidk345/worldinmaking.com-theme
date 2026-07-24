import React from 'react'

export default function CloudinaryImage({
    src,
    width,
    className = '',
    imgClassName = '',
    placeholder,
    objectFit,
    objectPosition,
    alt = '',
    ...other
}: {
    src: string
    width?: number | string
    className?: string
    imgClassName?: string
    objectFit?: 'cover' | 'contain'
    objectPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center'
} & React.ImgHTMLAttributes<HTMLImageElement>): JSX.Element {
    return (
        <img
            src={src}
            width={width}
            alt={alt}
            className={`${className} ${imgClassName}`.trim()}
            style={{
                ...(objectFit ? { objectFit } : {}),
                ...(objectPosition ? { objectPosition } : {}),
                ...other.style,
            }}
            {...other}
        />
    )
}
