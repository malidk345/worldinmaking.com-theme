/**
 * Input Sanitization and Validation Utilities
 * Provides security-focused helper functions for user input
 */

/**
 * Sanitize a string by removing potentially dangerous HTML/script content.
 * Preserves safe HTML tags from the rich text editor (Tiptap) while stripping
 * dangerous elements like script tags, event handlers, and javascript: URLs.
 */
export function sanitizeString(input: string | null | undefined): string {
    if (typeof input !== 'string') return '';

    return input
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove iframe tags
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        // Remove on* event handlers from tags (e.g. onclick, onload)
        .replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')
        // Remove javascript: URLs
        .replace(/javascript\s*:/gi, '')
        // Remove vbscript: URLs
        .replace(/vbscript\s*:/gi, '')
        .trim();
}

/**
 * Strip all HTML tags from a string, returning only plain text.
 * Useful for checking if rich text content is actually empty.
 */
export function stripHtmlTags(input: string | null | undefined): string {
    if (typeof input !== 'string') return '';
    return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize plain text (non-HTML) by escaping all HTML entities.
 * Use this for fields like titles/subjects that should not contain HTML.
 */
export function sanitizePlainText(input: string | null | undefined): string {
    if (typeof input !== 'string') return '';

    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

/**
 * Validate and sanitize a slug
 */
export function toSlug(input: string | null | undefined): string {
    if (typeof input !== 'string') return '';

    return input
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
