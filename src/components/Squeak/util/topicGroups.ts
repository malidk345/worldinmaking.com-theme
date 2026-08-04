import qs from 'qs'

const DEFAULT_TOPIC_GROUPS = [
    {
        id: 1,
        attributes: {
            name: 'Products',
            topics: {
                data: [
                    { id: 1, attributes: { label: 'Product Analytics', slug: 'product-analytics' } },
                    { id: 2, attributes: { label: 'Session Replay', slug: 'session-replay' } },
                    { id: 3, attributes: { label: 'Feature Flags', slug: 'feature-flags' } },
                ],
            },
        },
    },
    {
        id: 2,
        attributes: {
            name: 'Platform',
            topics: {
                data: [
                    { id: 4, attributes: { label: 'General', slug: 'general' } },
                    { id: 5, attributes: { label: 'API & SDKs', slug: 'sdks' } },
                ],
            },
        },
    },
]

export const fetchTopicGroups = async () => {
    try {
        if (!process.env.NEXT_PUBLIC_SQUEAK_API_HOST) {
            return DEFAULT_TOPIC_GROUPS
        }

        const topicGroupsQuery = qs.stringify(
            {
                populate: {
                    topics: {
                        populate: {
                            questions: {
                                sort: 'activeAt:desc',
                                fields: ['id', 'activeAt'],
                                filters: {
                                    $or: [
                                        {
                                            archived: {
                                                $null: true,
                                            },
                                        },
                                        {
                                            archived: {
                                                $eq: false,
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            },
            {
                encodeValuesOnly: true,
            }
        )
        const topicGroups = await fetch(
            `${process.env.NEXT_PUBLIC_SQUEAK_API_HOST}/api/topic-groups?${topicGroupsQuery}`
        )

        if (!topicGroups.ok) {
            return DEFAULT_TOPIC_GROUPS
        }

        const res = await topicGroups.json()
        return res?.data || DEFAULT_TOPIC_GROUPS
    } catch {
        return DEFAULT_TOPIC_GROUPS
    }
}

export const topicGroupsSorted = ['Products', 'Platform', 'Data', 'Self-hosting', 'Other']
