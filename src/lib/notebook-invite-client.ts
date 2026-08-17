export async function requestPhilosopherComment(input: {
    botId: string
    selection: string
    notebook?: string
}): Promise<{ text: string; author: string; botId: string }> {
    const res = await fetch('/api/notebook/invite-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            botId: input.botId,
            selection: input.selection,
            notebook: input.notebook || '',
        }),
    })
    const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; text?: string; author?: string; botId?: string; error?: string }
        | null
    if (!res.ok || !data?.ok || !data.text || !data.author) {
        throw new Error(data?.error || `Invite failed (${res.status})`)
    }
    return { text: data.text, author: data.author, botId: data.botId || input.botId }
}
