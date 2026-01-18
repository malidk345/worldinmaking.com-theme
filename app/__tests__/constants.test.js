/**
 * Tests for constants file
 */
import {
    HEADER_HEIGHT,
    MARGIN,
    MOBILE_BREAKPOINT,
    DEFAULT_WINDOW_WIDTH,
    DEFAULT_WINDOW_HEIGHT,
    MAX_VOTES_PER_USER,
    PREMIUM_SPRING,
    LAYOUT_SPRING,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
} from '../lib/constants';

describe('Layout Constants', () => {
    it('should have valid header height', () => {
        expect(HEADER_HEIGHT).toBe(38);
        expect(typeof HEADER_HEIGHT).toBe('number');
    });

    it('should have valid margin', () => {
        expect(MARGIN).toBe(8);
        expect(typeof MARGIN).toBe('number');
    });

    it('should have valid mobile breakpoint', () => {
        expect(MOBILE_BREAKPOINT).toBe(768);
        expect(typeof MOBILE_BREAKPOINT).toBe('number');
    });
});

describe('Window System Constants', () => {
    it('should have valid default dimensions', () => {
        expect(DEFAULT_WINDOW_WIDTH).toBe(800);
        expect(DEFAULT_WINDOW_HEIGHT).toBe(600);
    });
});

describe('Voting Constants', () => {
    it('should have valid max votes', () => {
        expect(MAX_VOTES_PER_USER).toBe(5);
        expect(MAX_VOTES_PER_USER).toBeGreaterThan(0);
    });
});

describe('Animation Springs', () => {
    it('should have valid premium spring config', () => {
        expect(PREMIUM_SPRING).toHaveProperty('type', 'spring');
        expect(PREMIUM_SPRING).toHaveProperty('stiffness');
        expect(PREMIUM_SPRING).toHaveProperty('damping');
        expect(PREMIUM_SPRING).toHaveProperty('mass');
    });

    it('should have valid layout spring config', () => {
        expect(LAYOUT_SPRING).toHaveProperty('type', 'spring');
        expect(LAYOUT_SPRING).toHaveProperty('stiffness');
        expect(LAYOUT_SPRING).toHaveProperty('damping');
    });
});

describe('Message Constants', () => {
    it('should have error messages', () => {
        expect(ERROR_MESSAGES).toHaveProperty('LOGIN_REQUIRED');
        expect(ERROR_MESSAGES).toHaveProperty('FETCH_FAILED');
        expect(typeof ERROR_MESSAGES.LOGIN_REQUIRED).toBe('string');
    });

    it('should have success messages', () => {
        expect(SUCCESS_MESSAGES).toHaveProperty('CREATED');
        expect(SUCCESS_MESSAGES).toHaveProperty('DELETED');
        expect(typeof SUCCESS_MESSAGES.CREATED).toBe('string');
    });
});
