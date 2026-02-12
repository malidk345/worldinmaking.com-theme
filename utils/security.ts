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
 * Sanitize HTML content while preserving safe tags
 */
export function sanitizeHtml(html: string | null | undefined): string {
    if (typeof html !== 'string') return '';

    // Remove script tags
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove on* event handlers from any tag
    clean = clean.replace(/\s*on\w+\s*=\s*(["'])[^"']*\1/gi, '');

    // Remove javascript: and data: from href/src
    clean = clean.replace(/href\s*=\s*(["'])javascript:[^"']*\1/gi, 'href="#"');
    clean = clean.replace(/src\s*=\s*(["'])data:[^"']*\1/gi, 'src=""');

    return clean;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string | null | undefined): boolean {
    if (typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string | null | undefined): boolean {
    if (typeof url !== 'string') return false;

    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
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

/**
 * Truncate text safely without breaking words
 */
export function truncateText(text: string | null | undefined, maxLength: number, suffix = '...'): string {
    if (typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;

    const trimmed = text.substring(0, maxLength - suffix.length);
    const lastSpace = trimmed.lastIndexOf(' ');

    if (lastSpace > 0) {
        return trimmed.substring(0, lastSpace) + suffix;
    }

    return trimmed + suffix;
}

/**
 * Rate limiter utility (client-side)
 */
export function createRateLimiter(maxCalls: number, windowMs: number) {
    const calls: number[] = [];

    return function checkLimit() {
        const now = Date.now();
        const windowStart = now - windowMs;

        while (calls.length > 0 && (calls[0] as number) < windowStart) {
            calls.shift();
        }

        if (calls.length >= maxCalls) {
            return false;
        }

        calls.push(now);
        return true;
    };
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File | null, options: { maxSize?: number, allowedTypes?: string[] } = {}) {
    const {
        maxSize = 5 * 1024 * 1024,
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    } = options;

    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: `File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)` };
    }

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
    }

    return { valid: true, error: null };
}

/**
 * Generate a secure random ID (client-safe)
 */
export function generateId(length = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    if (typeof window !== 'undefined' && window.crypto) {
        const values = new Uint32Array(length);
        window.crypto.getRandomValues(values);
        for (let i = 0; i < length; i++) {
            result += chars[(values[i] as number) % chars.length];
        }
    } else {
        for (let i = 0; i < length; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
    }

    return result;
}
