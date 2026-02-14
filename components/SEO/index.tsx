import React, { useEffect } from 'react'

interface SEOProps {
    title?: string
    description?: string
    image?: string
    url?: string
    article?: boolean
    noindex?: boolean
    canonicalUrl?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://worldinmaking.com"

export default function SEO({
    title,
    description,
    image,
    url,
    article,
    noindex,
    canonicalUrl
}: SEOProps) {
    const siteTitle = "World in Making"
    const defaultDescription = "Exploring product, engineering, and community through stories, tools, and insights."
    const twitterHandle = "@PostHog"

    useEffect(() => {
        const finalTitle = title ? `${title} | ${siteTitle}` : siteTitle
        document.title = finalTitle

        const updateMeta = (selector: string, attr: string, content: string | undefined) => {
            if (!content) return
            let el = document.querySelector(selector)
            if (!el) {
                const nameMatch = selector.match(/name="([^"]+)"/)
                const propMatch = selector.match(/property="([^"]+)"/)
                if (nameMatch) {
                    el = document.createElement('meta')
                    el.setAttribute('name', nameMatch[1])
                    document.head.appendChild(el)
                } else if (propMatch) {
                    el = document.createElement('meta')
                    el.setAttribute('property', propMatch[1])
                    document.head.appendChild(el)
                }
            }
            if (el) el.setAttribute(attr, content)
        }

        const updateLink = (rel: string, href: string | undefined) => {
            if (!href) return
            let el = document.querySelector(`link[rel="${rel}"]`)
            if (!el) {
                el = document.createElement('link')
                el.setAttribute('rel', rel)
                document.head.appendChild(el)
            }
            if (el) el.setAttribute('href', href)
        }

        // Helper to ensure absolute URL
        const getAbsoluteUrl = (pathOrUrl?: string) => {
            if (!pathOrUrl) return undefined
            if (pathOrUrl.startsWith('http')) return pathOrUrl
            const base = SITE_URL.endsWith('/') ? SITE_URL.slice(0, -1) : SITE_URL
            const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
            return `${base}${path}`
        }

        const finalUrl = getAbsoluteUrl(url) || (typeof window !== 'undefined' ? window.location.href : SITE_URL)
        const finalCanonical = getAbsoluteUrl(canonicalUrl) || finalUrl
        const finalImage = getAbsoluteUrl(image)

        // Basic Meta
        updateMeta('meta[name="description"]', 'content', description || defaultDescription)
        updateMeta('meta[name="robots"]', 'content', noindex ? 'noindex' : 'index, follow')

        // OG Tags
        updateMeta('meta[property="og:title"]', 'content', title || siteTitle)
        updateMeta('meta[property="og:description"]', 'content', description || defaultDescription)
        updateMeta('meta[property="og:type"]', 'content', article ? 'article' : 'website')
        updateMeta('meta[property="og:url"]', 'content', finalUrl)
        if (finalImage) updateMeta('meta[property="og:image"]', 'content', finalImage)

        // Twitter Tags
        updateMeta('meta[name="twitter:card"]', 'content', 'summary_large_image')
        updateMeta('meta[name="twitter:title"]', 'content', title || siteTitle)
        updateMeta('meta[name="twitter:description"]', 'content', description || defaultDescription)
        updateMeta('meta[name="twitter:site"]', 'content', twitterHandle)
        if (finalImage) updateMeta('meta[name="twitter:image"]', 'content', finalImage)

        // Canonical
        updateLink('canonical', finalCanonical)

    }, [title, description, image, url, article, noindex, canonicalUrl])

    return <></>
}
