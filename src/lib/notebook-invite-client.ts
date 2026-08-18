export type PhilosopherNoteResult = {
    botId: string
    author: string
    phrase: string
    text: string
    intent?: 'remark' | 'critique' | 'edit' | 'question' | 'aside'
    scope?: 'span' | 'piece' | 'block'
    suggestion?: string
}

export async function requestPhilosopherComment(input: {
    botId?: string
    botIds?: string[]
    duo?: boolean
    selection: string
    notebook?: string
}): Promise<PhilosopherNoteResult[]> {
    const res = await fetch('/api/notebook/invite-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            botId: input.botId,
            botIds: input.botIds,
            duo: input.duo,
            selection: input.selection,
            notebook: input.notebook || '',
        }),
    })
    const data = (await res.json().catch(() => null)) as
        | {
              ok?: boolean
              notes?: PhilosopherNoteResult[]
              text?: string
              author?: string
              botId?: string
              error?: string
          }
        | null
    if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Invite failed (${res.status})`)
    }
    if (Array.isArray(data.notes) && data.notes.length) {
        return data.notes.filter((note) => note.text && note.author)
    }
    if (data.text && data.author) {
        return [
            {
                botId: data.botId || input.botId || '',
                author: data.author,
                phrase: '',
                text: data.text,
            },
        ]
    }
    throw new Error(data.error || 'Empty comment')
}
