"use client"

import React from 'react'

const CLOUD_NAME = 'dmukukwp6'

const isCloudinaryImage = (url: string): boolean => {
    return url.includes('res.cloudinary.com')
}

const getCloudinaryPublicId = (url: string): string | null => {
    // Basic regex to extract public id from a cloudinary upload URL
    const cloudinaryUrlPattern =
        /https:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/
    const match = url.match(cloudinaryUrlPattern)
    return match ? match[1] : null
}

export default function CloudinaryImage({
    src,
    width,
    className = '',
    imgClassName = '',
    placeholder,
    objectFit,
    objectPosition,
    ...other
}: {
    src: string
    width?: number
    className?: string
    imgClassName?: string
    placeholder?: string
    objectFit?: 'cover' | 'contain'
    objectPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center'
} & React.ImgHTMLAttributes<HTMLImageElement>): any {

    // If it's a cloudinary image and we want to apply transformations
    let finalSrc = src
    if (isCloudinaryImage(src) && width) {
        const publicId = getCloudinaryPublicId(src)
        if (publicId) {
            // Reconstruct with transformation
            // Format: https://res.cloudinary.com/<cloud_name>/image/upload/w_<width>,c_scale/<public_id>
            finalSrc = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_${width},c_scale/${publicId}`
        }
    }

    return (
        <div className={`inline-block overflow-hidden ${className}`}>
            <img
                src={finalSrc}
                width={width}
                className={`w-full h-auto block ${imgClassName}`}
                style={{ objectFit, objectPosition }}
                {...other}
            />
        </div>
    )
}
