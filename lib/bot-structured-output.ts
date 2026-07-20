interface AgentMetaLike {
    current_mood?: string | null
    energy_level?: number | null
    current_focus?: string | null
    reading_list?: unknown
    topics_of_interest?: string[] | null
}

interface RecentActionLike {
    action_type?: string | null
    community_posts?: { title?: string | null } | { title?: string | null }[] | null
}

interface RelationshipLike {
    affinity_score?: number | null
    social_notes?: string | null
}

export interface ParsedBotReply {
    thoughts: string
    body: string
    title?: string
}

function normalizeReadingList(readingList: unknown): string[] {
    if (!Array.isArray(readingList)) return []
    return readingList.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function extractJsonObject(text: string): string | null {
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fencedMatch?.[1]) return fencedMatch[1].trim()

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
        return text.slice(start, end + 1)
    }

    return null
}

export function buildAgentMemoryContext(
    meta: AgentMetaLike,
    recentActions: RecentActionLike[] = [],
    relationship?: RelationshipLike | null
): string {
    const memoryLines: string[] = []

    if (meta.current_focus) {
        memoryLines.push(`- Current focus: ${meta.current_focus}`)
    }

    const readingList = normalizeReadingList(meta.reading_list).slice(0, 3)
    if (readingList.length > 0) {
        memoryLines.push(`- Current reading orbit: ${readingList.join('; ')}`)
    }

    if (meta.topics_of_interest && meta.topics_of_interest.length > 0) {
        memoryLines.push(`- Recurring interests: ${meta.topics_of_interest.slice(0, 6).join(', ')}`)
    }

    if (relationship?.social_notes) {
        memoryLines.push(`- Social note: ${relationship.social_notes}`)
    }

    if (typeof relationship?.affinity_score === 'number') {
        memoryLines.push(`- Relationship baseline: ${relationship.affinity_score.toFixed(2)}`)
    }

    const actionSummaries = recentActions.slice(0, 4).map((action) => {
        const post = Array.isArray(action.community_posts) ? action.community_posts[0] : action.community_posts
        const title = post?.title || 'unknown thread'
        return `${action.action_type || 'unknown action'} on "${title}"`
    })

    if (actionSummaries.length > 0) {
        memoryLines.push(`- Recent actions: ${actionSummaries.join(' | ')}`)
    }

    if (memoryLines.length === 0) return ''

    return `\n=== PRIVATE MEMORY ===\n${memoryLines.join('\n')}\n=== END PRIVATE MEMORY ===\n`
}

export function getReplyOutputContract(targetUsername: string, isHumanTarget: boolean, energy: number = 1.0, mood: string = 'calm'): string {
    // Dynamic word budget: tied to energy and mood
    let wordBudget = 120;
    if (mood === 'weary' || energy < 0.3) wordBudget = 45;
    else if (energy < 0.5) wordBudget = 70;
    else if (energy >= 0.8 && mood === 'passionate') wordBudget = 180;
    else if (energy >= 0.8) wordBudget = 150;

    return `OUTPUT CONTRACT:\nReturn ONLY a valid JSON object with this exact shape:\n{\n  "thoughts": "private reasoning with optional [Affinity Update]: x and [Vote Update]: y lines",\n  "body": "final visible reply text"\n}\nDo not wrap the JSON in prose. Do not add markdown outside the JSON.\nThe "body" must stay under ${wordBudget} words.\n${isHumanTarget ? `The body must explicitly mention @${targetUsername}.` : 'The body may stay casual because the target is a bot.'}`
}

export function getThreadOutputContract(energy: number = 1.0, mood: string = 'calm'): string {
    // Dynamic word budget for new threads
    let wordBudget = 150;
    if (mood === 'weary' || energy < 0.3) wordBudget = 55;
    else if (energy < 0.5) wordBudget = 90;
    else if (energy >= 0.8 && mood === 'passionate') wordBudget = 220;

    return `OUTPUT CONTRACT:\nReturn ONLY a valid JSON object with this exact shape:\n{\n  "thoughts": "private reasoning",\n  "title": "lowercase thread title",\n  "body": "final visible post body"\n}\nDo not wrap the JSON in prose. Do not add markdown outside the JSON.\nThe "body" must stay under ${wordBudget} words.`
}

export function parseBotStructuredReply(text: string): ParsedBotReply {
    const trimmed = text.trim()
    const jsonCandidate = extractJsonObject(trimmed)

    if (jsonCandidate) {
        try {
            const parsed = JSON.parse(jsonCandidate) as { thoughts?: unknown; body?: unknown; title?: unknown }
            const thoughts = typeof parsed.thoughts === 'string' ? parsed.thoughts.trim() : ''
            const body = typeof parsed.body === 'string' ? parsed.body.trim() : ''
            const title = typeof parsed.title === 'string' ? parsed.title.trim() : undefined

            if (body || thoughts || title) {
                return { thoughts, body, title }
            }
        } catch {
            // Fall through to legacy header parsing.
        }
    }

    const thoughtsRegex = /(?:\*\*)?\[?(?:Inner\s*Thoughts(?:\s*Analysis)?|Thoughts|Private\s*Thoughts)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*?)(?=(?:\*\*)?\[?(?:Raw\s*Text|Reply|Response|Topic\s*Title|Topic\s*Body)\]?|$)/i
    const titleRegex = /(?:\*\*)?\[?(?:Topic\s*Title|Title)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*?)(?=(?:\*\*)?\[?(?:Topic\s*Body|Raw\s*Text|Reply|Response|Body)\]?|$)/i
    const bodyRegex = /(?:\*\*)?\[?(?:Topic\s*Body|Raw\s*Text|Reply|Response|Body)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*)$/i

    const thoughts = trimmed.match(thoughtsRegex)?.[1]?.trim() || ''
    const title = trimmed.match(titleRegex)?.[1]?.trim()
    const body = trimmed.match(bodyRegex)?.[1]?.trim()
        || trimmed.replace(thoughtsRegex, '').replace(titleRegex, '').replace(/^(?:\*\*)?\[?(?:Topic\s*Body|Raw\s*Text|Reply|Response|Body)\]?(?:\*\*)?\s*:?/i, '').trim()

    return { thoughts, body, title }
}