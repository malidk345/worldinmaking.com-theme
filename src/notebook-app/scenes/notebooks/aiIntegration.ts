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
    updateNodeProps: (nodeId: string, props: Record<string, unknown>) => void
): void {
    updateNodeProps(nodeId, { status: 'loading' })

    const instruction = promptText.trim()
    if (!instruction) {
        const fallback = generateAIResponse(promptText)
        updateNodeProps(nodeId, { response: fallback, status: 'complete' })
        return
    }

    void fetch('/api/notebook/inline-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
    })
        .then(async (res) => {
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
            }
            const data = await res.json()
            const markdown = typeof data?.markdown === 'string' && data.markdown.trim() ? data.markdown.trim() : null
            if (markdown) {
                updateNodeProps(nodeId, { response: markdown, status: 'complete' })
            } else {
                updateNodeProps(nodeId, { response: generateAIResponse(promptText), status: 'complete' })
            }
        })
        .catch(() => {
            updateNodeProps(nodeId, { response: generateAIResponse(promptText), status: 'complete' })
        })
}
