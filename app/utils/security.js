/**
 * Input Sanitization and Validation Utilities
 * Provides security-focused helper functions for user input
 */

/**
 * Sanitize a string by removing potentially dangerous HTML/script content
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized string
 */
export function sanitizeString(input) {
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
 * For use with Markdown output that needs some HTML
 * @param {string} html - HTML string
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHtml(html) {
    if (typeof html !== 'string') return '';

    // List of allowed tags
    const allowedTags = [
        'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
        'img', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ];

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
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
export function isValidEmail(email) {
    if (typeof email !== 'string') return false;

    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
export function isValidUrl(url) {
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
 * @param {string} input - Input string
 * @returns {string} - URL-safe slug
 */
export function toSlug(input) {
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
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} - Truncated text
 */
export function truncateText(text, maxLength, suffix = '...') {
    if (typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;

    // Find the last space before maxLength
    const trimmed = text.substring(0, maxLength - suffix.length);
    const lastSpace = trimmed.lastIndexOf(' ');

    if (lastSpace > 0) {
        return trimmed.substring(0, lastSpace) + suffix;
    }

    return trimmed + suffix;
}

/**
 * Rate limiter utility (client-side)
 * Returns a function that tracks call frequency
 * @param {number} maxCalls - Maximum calls allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} - Rate check function
 */
export function createRateLimiter(maxCalls, windowMs) {
    const calls = [];

    return function checkLimit() {
        const now = Date.now();
        const windowStart = now - windowMs;

        // Remove old calls outside the window
        while (calls.length > 0 && calls[0] < windowStart) {
            calls.shift();
        }

        if (calls.length >= maxCalls) {
            return false; // Rate limited
        }

        calls.push(now);
        return true; // Allowed
    };
}

/**
 * Validate file upload
 * @param {File} file - File object
 * @param {Object} options - Validation options
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateFileUpload(file, options = {}) {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB default
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
 * @param {number} length - Length of the ID
 * @returns {string} - Random alphanumeric ID
 */
export function generateId(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    // Use crypto.getRandomValues if available
    if (typeof window !== 'undefined' && window.crypto) {
        const values = new Uint32Array(length);
        window.crypto.getRandomValues(values);
        for (let i = 0; i < length; i++) {
            result += chars[values[i] % chars.length];
        }
    } else {
        // Fallback for non-browser environments
        for (let i = 0; i < length; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
    }

    return result;
}
