import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Custom rules - suppress non-critical lint warnings for production readiness
  {
    rules: {
      // TypeScript strict rules - off for flexibility with Supabase responses
      "@typescript-eslint/no-explicit-any": "off",
      // Unused vars with underscore prefix are allowed
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      // React hooks - some SSR patterns require useEffect with setState
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/immutability": "off",
      // JSX text - allow apostrophes
      "react/no-unescaped-entities": "off",
    }
  }
]);

export default eslintConfig;
