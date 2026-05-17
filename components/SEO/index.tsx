"use client"
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
    const siteTitle = "world in making"
    const defaultDescription = "Exploring product, engineering, and community through stories, tools, and insights."
    const twitterHandle = "@worldinmaking"

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

        // Helper to ensure absolute URL with trailing slash (matching next.config.ts)
        const getAbsoluteUrl = (pathOrUrl?: string, isImage?: boolean) => {
            if (!pathOrUrl) return undefined

            let finalUrl = ''
            if (pathOrUrl.startsWith('http')) {
                finalUrl = pathOrUrl
            } else {
                const base = SITE_URL.endsWith('/') ? SITE_URL.slice(0, -1) : SITE_URL
                const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
                finalUrl = `${base}${path}`
            }

            // Ensure trailing slash for non-image URLs if missing and no query params
            if (!isImage && !finalUrl.includes('?') && !finalUrl.endsWith('/')) {
                finalUrl += '/'
            }

            return finalUrl
        }

        const currentUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : SITE_URL
        const finalUrl = getAbsoluteUrl(url) || (currentUrl.endsWith('/') ? currentUrl : `${currentUrl}/`)
        const finalCanonical = getAbsoluteUrl(canonicalUrl) || finalUrl
        const finalImage = getAbsoluteUrl(image, true)

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

        return () => {
            // Clean up when unmounting to prevent conflicting SEO if multiple windows opened/closed
            // Usually not necessary on full page loads, but critical for floating windows
            if (title) document.title = siteTitle;
            // Optionally, remove injected meta tags, though keeping the last one is generally harmless if replaced.
        }
    }, [title, description, image, url, article, noindex, canonicalUrl])

    return <></>
}
