// Helper function to strip Markdown syntax from text
export function stripMarkdown(markdown) {
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
        } catch (e) {
            // Fallback if DOMParser fails
        }
    }

    return text;
}

// Convert markdown to plain text with limit
export function getExcerpt(markdown, length = 150) {
    const text = stripMarkdown(markdown);
    if (text.length <= length) return text;
    return text.slice(0, length).trim() + '...';
}
