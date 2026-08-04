export function generateAIResponse(prompt: string): string {
    const lower = prompt.toLowerCase()

    if (lower.includes('sql') || lower.includes('query') || lower.includes('hogql')) {
        return `### PostHog AI Query Recommendation

Here is a HogQL query based on your prompt **"${prompt}"**:

\`\`\`sql
SELECT
    event,
    count() AS total_count,
    count(DISTINCT person_id) AS unique_users
FROM events
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY event
ORDER BY total_count DESC
LIMIT 10
\`\`\`

<ph-sql-v2 />
`
    }

    if (lower.includes('flag') || lower.includes('feature') || lower.includes('release')) {
        return `### PostHog AI Feature Rollout Plan

Here is an automated rollout strategy for **"${prompt}"**:

1. **Create Feature Flag**:
<ph-feature-flag id="ai-generated-feature" />

2. **Rollout Checklist**:
- [x] Configure flag variant distribution
- [ ] Monitor error rate on key user cohort
- [ ] Enable for 50% of active sessions

3. **Metrics Tracking**:
<ph-query />
`
    }

    if (lower.includes('bug') || lower.includes('error') || lower.includes('incident') || lower.includes('replay')) {
        return `### PostHog AI Incident Analysis

Here are suggested investigation steps for **"${prompt}"**:

- **Session Replays**:
<ph-recording />

- **Impacted Cohort**:
<ph-cohort />

> **AI Note**: Check for spikes in network errors around the affected timestamp range.
`
    }

    return `### PostHog AI Response

Based on your prompt: **"${prompt}"**

- Analyzed telemetry & notebook context.
- Suggested action items:

1. Review associated session replays & logs.
2. Run HogQL exploration query:

\`\`\`python
# PostHog Python Exploration
def inspect_telemetry():
    print("Analyzing event stream for ${prompt}")
\`\`\`
`
}

export function handleAskAI(
    nodeId: string,
    promptText: string,
    updateNodeProps: (nodeId: string, props: Record<string, any>) => void
): void {
    const response = generateAIResponse(promptText)
    updateNodeProps(nodeId, {
        question: promptText,
        response,
        status: 'done',
    })
}
