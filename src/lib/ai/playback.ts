/** Break a finished reply into typewriter-sized SSE token frames. */
export function playbackChunks(text: string, size = 56): string[] {
    if (!text) return []
    const chunks: string[] = []
    let index = 0
    while (index < text.length) {
        let end = Math.min(index + size, text.length)
        if (end < text.length) {
            const space = text.lastIndexOf(' ', end)
            if (space > index + 20) end = space + 1
        }
        chunks.push(text.slice(index, end))
        index = end
    }
    return chunks
}

export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
