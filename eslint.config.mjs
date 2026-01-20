import js from "@eslint/js";
import eslintConfigNext from "eslint-config-next";

const eslintConfig = [
    {
        ignores: [
            "node_modules/",
            ".next/",
            "out/",
            "public/",
            "*.config.js",
            "*.config.mjs",
            "build_output.txt",
            "lint_output.txt",
            "build_log.txt",
            "lint.txt",
        ],
    },
    js.configs.recommended,
    ...eslintConfigNext,
    {
        rules: {
            // Disable unescaped entities rule (common in JSX)
            "react/no-unescaped-entities": "off",
            // Disable exhaustive-deps (can cause issues with complex callbacks)
            "react-hooks/exhaustive-deps": "warn",
            // Allow console in development
            "no-console": ["warn", { allow: ["warn", "error"] }],
            // Reduce setState in effect to warning (not a critical error)
            "react-hooks/set-state-in-effect": "warn",
            // Next.js img element warning
            "@next/next/no-img-element": "warn",
            // Alt text for images
            "jsx-a11y/alt-text": "warn",
        },
    },
    {
        // Test files - Jest globals
        files: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)", "jest.setup.js"],
        languageOptions: {
            globals: {
                describe: "readonly",
                it: "readonly",
                test: "readonly",
                expect: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                jest: "readonly",
            },
        },
    },
];

export default eslintConfig;
