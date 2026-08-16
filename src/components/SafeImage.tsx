import Image, { type ImageProps } from 'next/image'
import React from 'react'

import { canOptimizeRemoteImage } from 'lib/next-image-hosts'

type SafeImageProps = Omit<ImageProps, 'src'> & {
    src: string
}

export function SafeImage({ src, alt, className, fill, width, height, style, ...rest }: SafeImageProps) {
    const resolved = String(src || '').trim()
    if (!resolved) return null

    if (canOptimizeRemoteImage(resolved)) {
        return (
            <Image
                src={resolved}
                alt={alt || ''}
                className={className}
                fill={fill}
                width={fill ? undefined : width}
                height={fill ? undefined : height}
                style={style}
                {...rest}
            />
        )
    }

    return (
        <img
            src={resolved}
            alt={alt || ''}
            className={className}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            style={
                fill
                    ? {
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: (style as React.CSSProperties | undefined)?.objectFit || 'contain',
                          ...style,
                      }
                    : style
            }
        />
    )
}

export default SafeImage
