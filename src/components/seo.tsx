'use client'
import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useApp } from '../context/App'
import { useWindow } from '../context/Window'
import { isMarkdownContentPath } from '../constants'

interface SEOProps {
    title: string
    description?: string
    image?: string
    article?: boolean
    canonicalUrl?: string
    noindex?: boolean
    imageType?: 'absolute' | 'relative'
    updateWindowTitle?: boolean
    lang?: string
    languageAlternates?: LanguageAlternate[]
    /** schema.org JSON-LD object(s) emitted as <script type="application/ld+json"> */
    structuredData?: Record<string, any> | Record<string, any>[]
    documentRkey?: string
}

// PostHog's AT Protocol identity, used for Standard.site discovery links
const STANDARD_SITE_DID = 'did:plc:go7eemqz4y5nhonj4kg5w2p6'

export type LanguageAlternate = {
    hrefLang: string
    href: string
}

// Static site metadata — replaces Gatsby useStaticQuery
const SITE_METADATA = {
    defaultTitle: 'WorldInMaking',
    titleTemplate: '%s | WorldInMaking',
    defaultDescription: 'We make your product self-driving',
    siteUrl: 'https://posthog.com',
    defaultImage: '',
    twitterUsername: '@posthog',
}

export const SEO = ({
    title,
    description,
    image,
    article,
    canonicalUrl,
    noindex,
    imageType = 'relative',
    updateWindowTitle = true,
    lang,
    languageAlternates,
    structuredData,
    documentRkey,
}: SEOProps): JSX.Element => {
    const windowContext = useWindow()
    const appWindow = windowContext?.appWindow
    const appContext = useApp()
    const setWindowTitle = appContext?.setWindowTitle
    const pathname = usePathname() || '/'

    const { defaultTitle, titleTemplate, defaultDescription, siteUrl, defaultImage, twitterUsername } = SITE_METADATA

    const structuredDataItems = structuredData
        ? Array.isArray(structuredData)
            ? structuredData
            : [structuredData]
        : []

    const seo = {
        title: title || defaultTitle,
        description: description || defaultDescription,
        image:
            imageType === 'absolute' || image?.startsWith('http')
                ? image
                : `${siteUrl}${image || defaultImage}`,
        url: `${siteUrl}${pathname}`,
    }

    useEffect(() => {
        if (updateWindowTitle && seo.title && appWindow && setWindowTitle) {
            setWindowTitle(appWindow, seo.title)
        }
    }, [seo.title, updateWindowTitle, appWindow, setWindowTitle])

    // In Next.js App Router, head tags are managed via metadata API or next/head.
    // This component returns null for server rendering; window title is updated client-side.
    return <></>
}

export default SEO

/**
 * Build schema.org JSON-LD for a product/app page: a SoftwareApplication, the PostHog
 * Organization, and (optionally) a FAQPage. Pass the result to <SEO structuredData={...} />.
 * FAQ entries without an `answer` are skipped, so FAQPage only renders once answers exist.
 */
export const buildProductStructuredData = ({
    name,
    description,
    slug,
    operatingSystem = 'Web',
    faq,
}: {
    name: string
    description?: string
    slug: string
    operatingSystem?: string
    faq?: { question?: string; answer?: string }[]
}): Record<string, any>[] => {
    const items: Record<string, any>[] = [
        {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name,
            description,
            applicationCategory: 'BusinessApplication',
            operatingSystem,
            url: `https://posthog.com/${(slug || '').replace(/^\//, '')}`,
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description: 'Generous free tier, then usage-based pricing',
            },
            publisher: { '@type': 'Organization', name: 'PostHog', url: 'https://posthog.com' },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'PostHog',
            url: 'https://posthog.com',
            logo: 'https://posthog.com/images/og/default.png',
            sameAs: [
                'https://twitter.com/PostHog',
                'https://github.com/PostHog',
                'https://www.linkedin.com/company/posthog',
            ],
        },
    ]
    const faqEntities = (faq || [])
        .filter((q) => q && q.question && q.answer)
        .map((q) => ({
            '@type': 'Question',
            name: q.question,
            acceptedAnswer: { '@type': 'Answer', text: q.answer },
        }))
    if (faqEntities.length) {
        items.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqEntities })
    }
    return items
}
