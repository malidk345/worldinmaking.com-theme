import React, { useEffect } from 'react'
import Head from 'next/head'
import { useLocation } from '../hooks/useLocation'
import { useOptionalApp } from '../context/App'
import { useOptionalWindow } from '../context/Window'
import {
    SITE,
    absoluteUrl,
    formatSeoDescription,
    formatSeoTitle,
    pageCanonical,
} from '../lib/seo'

export type LanguageAlternate = {
    hrefLang: string
    href: string
}

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
    structuredData?: Record<string, any> | Record<string, any>[]
    documentRkey?: string
    publishedTime?: string
    modifiedTime?: string
    authorName?: string
    imageAlt?: string
}

function WindowTitleSync({ title, enabled }: { title: string; enabled: boolean }) {
    const windowContext = useOptionalWindow()
    const appWindow = windowContext?.appWindow
    const appContext = useOptionalApp()
    const setWindowTitle = appContext?.setWindowTitle

    useEffect(() => {
        if (enabled && title && appWindow && setWindowTitle) {
            setWindowTitle(appWindow, title)
        }
    }, [title, enabled, appWindow, setWindowTitle])

    return null
}

export const SEO = ({
    title,
    description,
    image,
    article,
    canonicalUrl,
    noindex,
    updateWindowTitle = true,
    lang = 'en',
    languageAlternates,
    structuredData,
    publishedTime,
    modifiedTime,
    authorName,
    imageAlt,
}: SEOProps): JSX.Element => {
    const { pathname } = useLocation()
    const formattedTitle = formatSeoTitle(title)
    const metaDescription = formatSeoDescription(description || SITE.defaultDescription)
    const canonical = canonicalUrl || pageCanonical(pathname)
    const ogImage = absoluteUrl(image || SITE.defaultImage)
    const robots = noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    const structuredDataItems = structuredData
        ? Array.isArray(structuredData)
            ? structuredData
            : [structuredData]
        : []
    const ogLocale = lang === 'tr' ? 'tr_TR' : 'en_US'

    return (
        <>
            <Head>
                <title>{formattedTitle}</title>
                <meta name="description" content={metaDescription} />
                <link rel="canonical" href={canonical} />
                <link rel="alternate" hrefLang="en" href={canonical} />
                <link rel="alternate" hrefLang="x-default" href={canonical} />
                <link
                    rel="alternate"
                    type="application/rss+xml"
                    title="worldinmaking posts"
                    href={`${SITE.url}/feed.xml`}
                />
                <meta name="robots" content={robots} />
                <meta name="googlebot" content={robots} />
                <meta property="og:locale" content={ogLocale} />
                <meta property="og:type" content={article ? 'article' : 'website'} />
                <meta property="og:site_name" content={SITE.name} />
                <meta property="og:title" content={formattedTitle} />
                <meta property="og:description" content={metaDescription} />
                <meta property="og:url" content={canonical} />
                <meta property="og:image" content={ogImage} />
                <meta property="og:image:alt" content={imageAlt || formattedTitle} />
                {article && publishedTime ? <meta property="article:published_time" content={publishedTime} /> : null}
                {article && (modifiedTime || publishedTime) ? (
                    <meta property="article:modified_time" content={modifiedTime || publishedTime} />
                ) : null}
                {article && authorName ? <meta property="article:author" content={authorName} /> : null}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={formattedTitle} />
                <meta name="twitter:description" content={metaDescription} />
                <meta name="twitter:image" content={ogImage} />
                {languageAlternates?.map((alt) => (
                    <link key={alt.hrefLang} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />
                ))}
                {structuredDataItems.map((item, index) => (
                    <script
                        // eslint-disable-next-line react/no-danger
                        key={index}
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
                    />
                ))}
            </Head>
            <WindowTitleSync title={formattedTitle} enabled={updateWindowTitle} />
        </>
    )
}

export default SEO

/** @deprecated PostHog product schema — kept so leftover templates compile. Prefer buildWebSiteJsonLd. */
export const buildProductStructuredData = ({
    name,
    description,
    slug,
}: {
    name: string
    description?: string
    slug: string
    operatingSystem?: string
    faq?: { question?: string; answer?: string }[]
}): Record<string, any>[] => {
    return [
        {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: formatSeoTitle(name),
            description: description || SITE.defaultDescription,
            url: pageCanonical(slug),
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Web',
            publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
        },
    ]
}
