import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends("next/core-web-vitals"),
    {
        rules: {
            // Disable unescaped entities rule (common in JSX)
            "react/no-unescaped-entities": "off",
            // Disable exhaustive-deps (can cause issues with complex callbacks)
            "react-hooks/exhaustive-deps": "warn",
            // Allow console in development
            "no-console": ["warn", { allow: ["warn", "error"] }],
        },
    },
    {
        // Ignore patterns
        ignores: [
            "node_modules/",
            ".next/",
            "out/",
            "public/",
            "*.config.js",
            "*.config.mjs",
        ],
    },
];

export default eslintConfig;
