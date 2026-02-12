import React from 'react'

interface SEOProps {
    title?: string
    description?: string
    image?: string
    url?: string
}

export default function SEO({ title, description, image, url }: SEOProps): JSX.Element {
    React.useEffect(() => {
        document.title = title || 'PostHog'

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]')
        if (metaDescription && description) {
            metaDescription.setAttribute('content', description)
        }

        // Update og:title
        const ogTitle = document.querySelector('meta[property="og:title"]')
        if (ogTitle && title) {
            ogTitle.setAttribute('content', title)
        }

        // Update og:description
        const ogDescription = document.querySelector('meta[property="og:description"]')
        if (ogDescription && description) {
            ogDescription.setAttribute('content', description)
        }

        // Update og:image
        const ogImage = document.querySelector('meta[property="og:image"]')
        if (ogImage && image) {
            ogImage.setAttribute('content', image)
        }
    }, [title, description, image, url])

    return null
}
