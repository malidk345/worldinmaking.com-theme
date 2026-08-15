export function generateAIResponse(prompt: string): string {
    const topic = prompt.trim() || 'this note'

    return `### Notes

**Topic:** ${topic}

- Clarify the claim in one sentence.
- List the strongest supporting reasons.
- Name the best objection and answer it.
- End with a short next step you can write today.
`
}

export function handleAskAI(
    nodeId: string,
    promptText: string,
    updateNodeProps: (nodeId: string, props: Record<string, any>) => void
): void {
    const response = generateAIResponse(promptText)
    updateNodeProps(nodeId, { response, status: 'complete' })
}
