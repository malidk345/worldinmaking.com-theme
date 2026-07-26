import React from 'react'
import List from 'components/List'
import { getLogo } from '../../constants/logos'

type LibraryNode = {
    fields: {
        slug: string
    }
    frontmatter: {
        title: string
        platformLogo?: string
        icon?: {
            publicURL: string
        }
        features: LibraryFeatures | null
    }
}

type FrameworkNode = {
    fields: {
        slug: string
    }
    frontmatter: {
        title: string
        sidebarTitle?: string
        platformLogo?: string
        icon?: {
            publicURL: string
        }
    }
}

type LibraryFeatures = {
    eventCapture: boolean
    autoCapture: boolean
    featureFlags: boolean
    groupAnalytics: boolean
    sessionRecording: boolean
    userIdentification: boolean
    surveys: boolean
    aiObservability: boolean
    errorTracking: boolean
}

type LibraryData = {
    sdks: {
        nodes: LibraryNode[]
    }
    frameworks: {
        nodes: FrameworkNode[]
    }
}

export const SDKs = () => {
    const { sdks } = useStaticQuery<LibraryData>(query)

    return (
        <List
            className="grid @sm:grid-cols-2 @xl:grid-cols-3"
            items={(sdks?.nodes || []).map(({ fields: { slug }, frontmatter: { title, platformLogo, icon } }) => ({
                label: title,
                url: slug,
                image: platformLogo ? getLogo(platformLogo) : icon?.publicURL,
            }))}
        />
    )
}

export const Frameworks = () => {
    const { frameworks } = useStaticQuery<LibraryData>(query)

    return (
        <List
            className="grid @sm:grid-cols-2 @xl:grid-cols-3"
            items={(frameworks?.nodes || []).map(
                ({ fields: { slug }, frontmatter: { title, sidebarTitle, platformLogo, icon } }) => ({
                    label: sidebarTitle || title,
                    url: slug,
                    image: platformLogo ? getLogo(platformLogo) : icon?.publicURL,
                })
            )}
        />
    )
}

