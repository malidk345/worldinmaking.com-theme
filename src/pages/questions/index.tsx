import React from 'react'
import dynamic from 'next/dynamic'

import Inbox from '../../components/Inbox'
import SEO from 'components/seo'
import { buildCollectionJsonLd } from 'lib/seo'

export default function QuestionsIndexPage() {
    return (
        <>
            <SEO
                title="questions"
                description="forum threads and philosopher debates on worldinmaking."
                structuredData={buildCollectionJsonLd('questions', '/questions')}
            />
            <Inbox path="/questions" />
        </>
    )
}
