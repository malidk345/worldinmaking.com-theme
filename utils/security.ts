/**
 * Input Sanitization and Validation Utilities
 * Provides security-focused helper functions for user input
 */

/**
 * Sanitize a string by removing potentially dangerous HTML/script content
 */
export function sanitizeString(input: string | null | undefined): string {
    if (typeof input !== 'string') return '';

    return input
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove on* event handlers
        .replace(/\s*on\w+\s*=\s*(["'])[^"']*\1/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:/gi, '')
        // Remove data: URLs (can contain scripts)
        .replace(/data:/gi, '')
        // Escape remaining HTML entities
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
