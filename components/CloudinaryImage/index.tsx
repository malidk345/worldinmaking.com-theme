"use client"

import React from 'react'
import Image, { ImageLoaderProps } from 'next/image'

const isCloudinaryImage = (url: string): boolean => {
    return url.includes('res.cloudinary.com')
}

const getCloudinaryInfo = (url: string): { cloudName: string, publicId: string } | null => {
    // Regex to extract cloud name and public id: https://res.cloudinary.com/[cloudName]/image/upload/.../[publicId]
    const cloudinaryUrlPattern = /https?:\/\/res\.cloudinary\.com\/([^/]+)\/(?:image|video)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/
    const match = url.match(cloudinaryUrlPattern)
    if (match && match[1] && match[2]) {
        return { cloudName: match[1], publicId: match[2] }
    }
    return null
}

const cloudinaryLoader = ({ src, width, quality }: ImageLoaderProps) => {
    if (!isCloudinaryImage(src)) return src

    const info = getCloudinaryInfo(src)
    if (!info) return src

    const { cloudName, publicId } = info

    // c_limit ensures we don't upscale beyond original
    // f_auto picks best format (WebP/AVIF)
    // q_auto picks best quality
    const params = [
        `w_${width}`,
        'c_limit',
        `q_${quality || 'auto'}`,
        'f_auto'
    ].join(',')

    return `https://res.cloudinary.com/${cloudName}/image/upload/${params}/${publicId}`
}

export default function CloudinaryImage({
    src,
    width,
    height,
    alt = '',
    className = '',
    imgClassName = '',
    objectFit = 'cover',
    objectPosition = 'center',
    priority = false,
    fill = false,
    ...other
}: {
    src: string
    width?: number
    height?: number
    alt?: string
    className?: string
    imgClassName?: string
    objectFit?: 'cover' | 'contain'
    objectPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center'
    priority?: boolean
    fill?: boolean
} & Omit<React.ComponentProps<typeof Image>, 'src' | 'alt' | 'width' | 'height' | 'fill' | 'loader'>) {

    // Next.js Image requires both width and height if not using fill.
    // If one is missing, we assume 1:1 aspect ratio or use fill if both missing.
    const isFill = fill || (!width && !height)
    const finalWidth = !isFill ? width || height : undefined
    const finalHeight = !isFill ? height || width : undefined

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <Image
                src={src}
                alt={alt}
                width={finalWidth}
                height={finalHeight}
                fill={isFill}
                loader={isCloudinaryImage(src) ? cloudinaryLoader : undefined}
                className={`block ${imgClassName}`}
                style={{ objectFit, objectPosition }}
                priority={priority}
                {...other}
            />
        </div>
    )
}
