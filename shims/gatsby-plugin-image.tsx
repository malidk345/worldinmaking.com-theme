import React from 'react'

export const GatsbyImage = (props: any) => {
    const { image, alt, className } = props
    const src = typeof image === 'string' ? image : image?.images?.fallback?.src || image?.src
    return <img src={src} alt={alt || ''} className={className} />
}

export const StaticImage = (props: any) => {
    return <img {...props} />
}

export const getImage = (image: any) => {
    if (!image) return null
    if (typeof image === 'string') return image
    return image?.childImageSharp?.gatsbyImageData || image
}
