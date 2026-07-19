/**
 * Helper function to strip Markdown syntax from text
 */
export function stripMarkdown(markdown: string | null | undefined): string {
    if (!markdown) return '';

    let text = markdown
        // Remove headers
        .replace(/^#+\s+/gm, '')
        // Remove bold/italic
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        // Remove links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove images
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
        // Remove blockquotes
        .replace(/^>\s+/gm, '')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        // Remove lists
        .replace(/^[\*\-\+]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        // Remove horizontal rules
        .replace(/^---$/gm, '')
        // Remove HTML tags (basic regex)
        .replace(/<[^>]*>/g, '')
        // Remove extra newlines
        .replace(/\n\s*\n/g, '\n')
        .trim();

    // If client-side, use DOMParser to strip remaining HTML and decode entities
    if (typeof window !== 'undefined') {
        try {
            const doc = new DOMParser().parseFromString(text, 'text/html');
            text = doc.body.textContent || text;
        } catch {
            // Fallback if DOMParser fails
        }
    }

    return text;
}

export function getExcerpt(markdown: string | null | undefined, length: number = 150): string {
    if (!markdown) return '';
    const plainText = stripMarkdown(markdown);
    if (plainText.length <= length) return plainText;
    return plainText.substring(0, length).trimEnd() + '...';
}
