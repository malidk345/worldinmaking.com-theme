import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
    {
        ignores: ["out/", ".next/", "node_modules/"],
    },
    js.configs.recommended,
    ...compat.extends("plugin:react/recommended", "plugin:react-hooks/recommended"),
     {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "react/no-unescaped-entities": "off",
            "no-useless-escape": "off",
            // "react-hooks/exhaustive-deps": "off", // Re-enabled to ensure hook safety
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
];
