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

export type ExcerptOptions = {
    length?: number;
    query?: string;
};

/**
 * Convert markdown to plain text with limit.
 * Optionally extracts a snippet surrounding a search query.
 */
export function getExcerpt(markdown: string | null | undefined, optionsOrLength?: number | ExcerptOptions): string {
    const text = stripMarkdown(markdown).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return '';

    let length = 150;
    let query = '';

    if (typeof optionsOrLength === 'number') {
        length = optionsOrLength;
    } else if (optionsOrLength) {
        length = optionsOrLength.length || 150;
        query = optionsOrLength.query || '';
    }

    if (query) {
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const idx = lowerText.indexOf(lowerQuery);

        if (idx !== -1) {
            const start = Math.max(0, idx - 40);
            const end = Math.min(text.length, idx + query.length + 80);
            let excerpt = text.slice(start, end);

            if (start > 0) excerpt = '...' + excerpt;
            if (end < text.length) excerpt = excerpt + '...';
            return excerpt;
        }
    }

    if (text.length <= length) return text;
    return text.slice(0, length).trim() + '...';
}
