import DOMPurify from 'isomorphic-dompurify';

/**
 * Input Sanitization and Validation Utilities
 * Provides security-focused helper functions for user input.
 */

/**
 * Sanitize a string by removing potentially dangerous HTML/script content.
 * Preserves safe HTML tags from the rich text editor (Tiptap) while stripping
 * dangerous elements like script tags, event handlers, and javascript: URLs.
 */
export function sanitizeString(input: string | null | undefined): string {
    if (typeof input !== 'string') return ''

    if (DOMPurify && DOMPurify.sanitize) {
        return DOMPurify.sanitize(input);
    }

    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<(object|embed|base|link|meta|style)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
        .replace(/<(script|object|embed|base|link|meta|style)\b[^>]*>/gi, '')
        .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, ' ')
        .replace(/(javascript|vbscript|data):/gi, (match) => `_target_${match}`)
        .trim()
}

/**
 * Keep HTML sanitization edge-safe by reusing the HTML-preserving string sanitizer.
 * This avoids bundling browser-only DOM libraries into server and edge routes.
 */
export function sanitizeHtml(html: string | null | undefined, options = {}): string {
    if (typeof html !== 'string') return ''

    if (DOMPurify && DOMPurify.sanitize) {
        return DOMPurify.sanitize(html, options);
    }

    return sanitizeString(html)
}

/**
 * Strip all HTML tags from a string, returning only plain text.
 * Useful for checking if rich text content is actually empty.
 */
export function stripHtmlTags(input: string | null | undefined): string {
    if (typeof input !== 'string') return ''
    return input.replace(/<[^>]*>/g, '').trim()
}

/**
 * Sanitize CSS to prevent XSS breakouts when used in style tags.
 */
export function sanitizeCss(css: string | null | undefined): string {
    if (typeof css !== 'string') return ''
    return css.replace(/</g, '')
}

/**
 * Sanitize plain text (non-HTML) by escaping all HTML entities.
 * Use this for fields like titles/subjects that should not contain HTML.
 */
export function sanitizePlainText(input: string | null | undefined): string {
    if (typeof input !== 'string') return ''

    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim()
}

/**
 * Validate and sanitize a slug.
 */
export function toSlug(input: string | null | undefined): string {
    if (typeof input !== 'string') return ''

    return input
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
}
