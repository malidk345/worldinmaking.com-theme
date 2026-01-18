/**
 * Tests for security utility functions
 */
import {
    sanitizeString,
    sanitizeHtml,
    isValidEmail,
    isValidUrl,
    toSlug,
    truncateText,
    createRateLimiter,
    validateFileUpload,
    generateId,
} from '../utils/security';

describe('sanitizeString', () => {
    it('should return empty string for non-string input', () => {
        expect(sanitizeString(null)).toBe('');
        expect(sanitizeString(undefined)).toBe('');
        expect(sanitizeString(123)).toBe('');
    });

    it('should remove script tags', () => {
        const input = 'Hello <script>alert("xss")</script> World';
        const result = sanitizeString(input);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
    });

    it('should escape HTML entities', () => {
        const input = '<div>Test</div>';
        const result = sanitizeString(input);
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
    });

    it('should remove javascript: URLs', () => {
        const input = 'Click here javascript:alert(1)';
        const result = sanitizeString(input);
        expect(result).not.toContain('javascript:');
    });

    it('should trim whitespace', () => {
        expect(sanitizeString('  hello  ')).toBe('hello');
    });
});

describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
        expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
        expect(isValidEmail('')).toBe(false);
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('no@domain')).toBe(false);
        expect(isValidEmail('@nodomain.com')).toBe(false);
        expect(isValidEmail(null)).toBe(false);
    });
});

describe('isValidUrl', () => {
    it('should return true for valid http/https URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true);
        expect(isValidUrl('http://test.org/path')).toBe(true);
        expect(isValidUrl('https://sub.domain.com:8080/path?query=1')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
        expect(isValidUrl('')).toBe(false);
        expect(isValidUrl('not-a-url')).toBe(false);
        expect(isValidUrl('ftp://files.com')).toBe(false); // Not http/https
        expect(isValidUrl('javascript:alert(1)')).toBe(false);
        expect(isValidUrl(null)).toBe(false);
    });
});

describe('toSlug', () => {
    it('should convert string to URL-safe slug', () => {
        expect(toSlug('Hello World')).toBe('hello-world');
        expect(toSlug('This is a TEST')).toBe('this-is-a-test');
        expect(toSlug('  Spaces  Around  ')).toBe('spaces-around');
    });

    it('should remove special characters', () => {
        expect(toSlug('Hello! @World#')).toBe('hello-world');
        expect(toSlug('Test (with) brackets')).toBe('test-with-brackets');
    });

    it('should handle empty or non-string input', () => {
        expect(toSlug('')).toBe('');
        expect(toSlug(null)).toBe('');
    });
});

describe('truncateText', () => {
    it('should not truncate short text', () => {
        expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text at word boundary', () => {
        const result = truncateText('This is a long sentence', 15);
        expect(result).toBe('This is a...');
        expect(result.length).toBeLessThanOrEqual(15);
    });

    it('should use custom suffix', () => {
        const result = truncateText('Hello World Test', 12, '…');
        expect(result).toContain('…');
    });

    it('should handle non-string input', () => {
        expect(truncateText(null, 10)).toBe('');
    });
});

describe('createRateLimiter', () => {
    it('should allow calls within limit', () => {
        const limiter = createRateLimiter(3, 1000);
        expect(limiter()).toBe(true);
        expect(limiter()).toBe(true);
        expect(limiter()).toBe(true);
    });

    it('should block calls over limit', () => {
        const limiter = createRateLimiter(2, 1000);
        expect(limiter()).toBe(true);
        expect(limiter()).toBe(true);
        expect(limiter()).toBe(false); // Third call blocked
    });
});

describe('validateFileUpload', () => {
    it('should reject no file', () => {
        const result = validateFileUpload(null);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('No file provided');
    });

    it('should reject file exceeding max size', () => {
        const file = { size: 10 * 1024 * 1024, type: 'image/jpeg' }; // 10MB
        const result = validateFileUpload(file, { maxSize: 5 * 1024 * 1024 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too large');
    });

    it('should reject invalid file type', () => {
        const file = { size: 1024, type: 'application/pdf' };
        const result = validateFileUpload(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
    });

    it('should accept valid file', () => {
        const file = { size: 1024, type: 'image/png' };
        const result = validateFileUpload(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBe(null);
    });
});

describe('generateId', () => {
    it('should generate ID of specified length', () => {
        expect(generateId(8).length).toBe(8);
        expect(generateId(16).length).toBe(16);
        expect(generateId(32).length).toBe(32);
    });

    it('should generate unique IDs', () => {
        const id1 = generateId();
        const id2 = generateId();
        expect(id1).not.toBe(id2);
    });

    it('should only contain alphanumeric characters', () => {
        const id = generateId(100);
        expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });
});
