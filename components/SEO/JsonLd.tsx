"use client"

import React from 'react'

interface ArticleJsonLdProps {
    title: string
    description: string
    url: string
    image?: string
    datePublished: string
    dateModified?: string
    authorName: string
    authorUrl?: string
    publisherName?: string
    publisherLogo?: string
}

interface BreadcrumbJsonLdProps {
    items: { name: string; url: string }[]
}

interface WebSiteJsonLdProps {
    name: string
    url: string
    description: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://worldinmaking.com"

export function ArticleJsonLd({
    title,
    description,
    url,
    image,
    datePublished,
    dateModified,
    authorName,
    authorUrl,
    publisherName = "World in Making",
    publisherLogo,
}: ArticleJsonLdProps) {
    const absoluteUrl = url.startsWith('http') ? url : `${SITE_URL}${url}`

    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        url: absoluteUrl,
        ...(image && { image: [image] }),
        datePublished,
        dateModified: dateModified || datePublished,
        author: {
            "@type": "Person",
            name: authorName,
            ...(authorUrl && { url: authorUrl }),
        },
        publisher: {
            "@type": "Organization",
            name: publisherName,
            ...(publisherLogo && {
                logo: {
                    "@type": "ImageObject",
                    url: publisherLogo,
                },
            }),
        },
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": absoluteUrl,
        },
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
        })),
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

export function WebSiteJsonLd({ name, url, description }: WebSiteJsonLdProps) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name,
        url,
        description,
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${url}/posts?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        },
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}
