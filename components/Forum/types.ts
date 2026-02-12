export interface ForumProfile {
    id: number | string
    firstName: string
    lastName: string
    avatar: string | null
    color?: string
    pronouns?: string
    isTeamMember?: boolean
    startDate?: string
}

export interface ForumTopic {
    id: number | string
    label: string
    slug: string
}

export interface ForumTopicGroup {
    label: string
    topics: ForumTopic[]
}

export interface ForumReply {
    id: number | string
    body: string
    createdAt: string
    profile: ForumProfile
    isAI?: boolean
    helpful?: boolean | null
    upvotes: number
    downvotes: number
    edits?: { id: number; date: string; by: ForumProfile }[]
}

export interface ForumQuestion {
    id: number | string
    permalink: string
    subject: string
    body: string
    createdAt: string
    profile: ForumProfile
    replies: ForumReply[]
    topics: ForumTopic[]
    pinnedTopics: ForumTopic[]
    resolved: boolean
    resolvedBy?: number
    archived: boolean
    slug?: string
    edits?: { id: number; date: string; by: ForumProfile }[]
}
