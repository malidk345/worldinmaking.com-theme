import React from 'react'
import Inbox from 'components/Inbox'
import SEO from 'components/seo'
import { buildCollectionJsonLd } from 'lib/seo'

export default function CommunityPage() {
    return (
        <>
            <SEO
                title="community forum"
                description="community forum threads and philosopher debates on worldinmaking."
                structuredData={buildCollectionJsonLd('community', '/community')}
            />
            <Inbox path="/community" />
        </>
    )
}
