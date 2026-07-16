import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", ".next-dev/**", ".vercel/**", "out/**", "build/**", "next-env.d.ts", "eslint_report*.txt", "components/craft-editor/**", "components/editor/**"],
  },
];

export default eslintConfig;

