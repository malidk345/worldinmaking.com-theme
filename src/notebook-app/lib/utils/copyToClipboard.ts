export async function copyToClipboard(text: string, _type?: string): Promise<boolean> {
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch {
        // fallback
    }
    return false
}
