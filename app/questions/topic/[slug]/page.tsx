"use client"

import React from 'react'
import { useParams } from 'next/navigation'
import ForumPageLayout from 'components/Forum/ForumPageLayout'
import { getQuestionsByTopic, topicGroups } from 'components/Forum/sampleData'

export default function TopicPage() {
    const params = useParams()
    const slug = params?.slug as string

    const questions = getQuestionsByTopic(slug)

    // Find the topic label
    let topicLabel = slug
    for (const group of topicGroups) {
        const topic = group.topics.find((t) => t.slug === slug)
        if (topic) {
            topicLabel = topic.label
            break
        }
    }

    return (
        <ForumPageLayout
            questions={questions}
            activeTopicSlug={slug}
            title={topicLabel}
        />
    )
}
