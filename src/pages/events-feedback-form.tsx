import React from 'react'
import { SEO } from 'components/seo'
import { Authentication } from 'components/Squeak'
import { useUser } from 'hooks/useUser'
import EmbeddedSurvey from 'components/Docs/EmbeddedSurvey'
import ScrollArea from 'components/RadixUI/ScrollArea'

const SURVEY_ID = process.env.GATSBY_EVENTS_FEEDBACK_SURVEY_ID ?? ''

export default function EventsFeedbackForm() {
    const { user, isLoading } = useUser()
    const isPostHogTeam = !!user?.email?.endsWith('@posthog.com')

    return (
        <>
            <SEO
                title="IRL events feedback"
                description="Sign in to submit IRL events feedback"
                image="/images/og/default.png"
            />
            null
        </>
    )
}
