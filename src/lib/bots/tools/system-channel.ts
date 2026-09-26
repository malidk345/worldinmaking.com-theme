/**
 * System text a provider should actually send.
 * Host notes (plan board, private thought, memories, "keep writing") are
 * appended to messages[0] after the base prompt is built. Adapters that
 * keep sending the original string never see those notes.
 * When the messages already carry a system turn, that text wins — do not
 * also prepend the frozen base, or the prompt is sent twice.
 */
export function systemTextFromMessages(
    messages: Array<{ role: string; content?: string | null }>,
    fallback = ''
): string {
    const parts: string[] = []
    for (const message of messages) {
        if (message.role !== 'system') continue
        const text = typeof message.content === 'string' ? message.content.trim() : ''
        if (text) parts.push(text)
    }
    if (parts.length === 0) return fallback
    return parts.join('\n\n')
}
