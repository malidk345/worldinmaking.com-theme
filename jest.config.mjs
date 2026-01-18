import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files
    dir: './',
});

/** @type {import('jest').Config} */
const config = {
    // Add more setup options before each test is run
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

    // Test environment
    testEnvironment: 'jsdom',

    // Module name mapper for path aliases
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/app/$1',
    },

    // Test file patterns
    testMatch: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)'
    ],

    // Coverage configuration
    collectCoverageFrom: [
        'app/**/*.{js,jsx}',
        '!app/**/*.d.ts',
        '!app/layout.js', // Skip layout as it's mostly imports
        '!**/node_modules/**',
    ],

    // Coverage thresholds (start low, increase over time)
    coverageThreshold: {
        global: {
            branches: 10,
            functions: 10,
            lines: 10,
            statements: 10,
        },
    },

    // Transform configuration
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
    },

    // Files to ignore
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.next/',
    ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
