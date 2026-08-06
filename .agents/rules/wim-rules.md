---
description: Core engineering rules and standards for WorldInMaking codebase
globs: "**/*"
---

# WorldInMaking Agent Rules

- **Package Manager:** Standardized on `pnpm`. Do NOT create `package-lock.json` or run `npm`/`yarn`.
- **AI Collaboration:** Before making changes, inspect `docs/architecture/AI_MEMORY.md`. Claim tasks (`[IN PROGRESS]`) and log completed work (`[COMPLETED]`).
- **Performance First:** Use `next/dynamic` for heavy below-the-fold components on desktop/marketing pages. Use `next/image` with Cloudinary/Supabase remote patterns.
- **Database Search:** `/api/search` uses database pattern matching via `searchSupabasePosts`. Do not load full post arrays into memory.
- **Auth & Security:** Supabase Auth is the single identity provider (`src/lib/wim-auth.ts`). Rate-limit LLM/bot APIs with `checkRateLimit`.
