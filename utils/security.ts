/**
 * Input Sanitization and Validation Utilities
 * Provides security-focused helper functions for user input
 */

import DOMPurify from 'dompurify';

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
        // Remove iframe, object, embed, base, link, meta, style tags
        // Updated: 'iframe' kept safe so YouTube/video embeds from editor render fine on SSR
        .replace(/<(object|embed|base|link|meta|style)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
        // Remove tags that are opened but not closed (basic)
        .replace(/<(script|object|embed|base|link|meta|style)\b[^>]*>/gi, '')
        // Remove on* event handlers more aggressively
        .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, ' ')
        // Remove javascript:, vbscript:, data: (for non-images) URLs
        .replace(/(javascript|vbscript|data):/gi, (match) => `_target_${match}`)
        .trim();
}

/**
 * Robust HTML sanitization using DOMPurify on the client.
 * Use this ideally anywhere you map HTML to dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string | null | undefined, options = {}): string {
    if (typeof html !== 'string') return '';

    // DOMPurify needs a window object. On the server, we fallback to a basic regex strip
    // since Cloudflare edge / Next SSR doesn't provide a JSDOM environment natively.
    if (typeof window === 'undefined') {
        return sanitizeString(html);
    }

    return DOMPurify.sanitize(html, {
        // By using ADD_TAGS instead of ALLOWED_TAGS, we let DOMPurify keep its default safe list
        // which already securely allows table, hr, img, a, br, p, em, strong, etc.
        ADD_TAGS: [
            'iframe', // If you plan to embed youtube later
            'mark', 'u', 'sub', 'sup', 'div', 'span'
        ],
        // ADD_ATTR prevents DOMPurify from clearing structural attributes like
        // Tiptap's table colwidths, html spans, target="_blank", or callout nodes' data-type.
        ADD_ATTR: ['target', 'data-type', 'class', 'style', 'colspan', 'rowspan', 'colwidth', 'width', 'height'],
        ALLOW_DATA_ATTR: true,
        ...options
    });
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
