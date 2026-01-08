// Helper function to strip Markdown syntax from text
export function stripMarkdown(markdown) {
    if (!markdown) return '';

    return markdown
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
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove extra newlines
        .replace(/\n\s*\n/g, '\n')
        .trim();
}

// Convert markdown to plain text with limit
export function getExcerpt(markdown, length = 150) {
    const text = stripMarkdown(markdown);
    if (text.length <= length) return text;
    return text.slice(0, length).trim() + '...';
}
