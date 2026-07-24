## 2024-05-18 - Prevent XSS in Post Page Server Render
**Vulnerability:** XSS vulnerability in `app/posts/[slug]/page.tsx` where user-provided post content was directly injected using `dangerouslySetInnerHTML` for the screen reader fallback (`<article className="sr-only">`).
**Learning:** Even visually hidden components (`sr-only`) that render user content directly using `dangerouslySetInnerHTML` are vectors for Cross-Site Scripting (XSS) if not sanitized.
**Prevention:** Always wrap variables passed to `dangerouslySetInnerHTML` with a sanitization function like `sanitizeHtml(content)` (which uses `isomorphic-dompurify`), regardless of where the element is rendered or its visibility.

## 2025-02-18 - Fix isomorphic-dompurify issue in edge runtime
**Vulnerability:** When Next.js crashes during SSR or in Edge runtimes with `TypeError: Cannot read properties of undefined (reading 'bind')` originating from `isomorphic-dompurify/dist/browser.mjs`, it is due to an environment context bug where `DOMPurify` is undefined.
**Learning:** Some packages may be incompatible with the Edge runtime without defensive coding.
**Prevention:** Resolve this by patching the module to check for `DOMPurify` existence before binding methods (e.g., `DOMPurify && DOMPurify.sanitize ? ...`) or by safely managing its server-side execution.

## 2025-02-18 - Fix Authentication Bypass in Agent Endpoints
**Vulnerability:** Agent endpoints `create-thread` and `respond` had a critical authentication bypass. The authorization check compared the provided token to `process.env.SUPABASE_SERVICE_ROLE_KEY || ''`. If `SUPABASE_SERVICE_ROLE_KEY` was missing, an empty string token (`Bearer `) would evaluate as authorized. Furthermore, `bot_token_` string prefix checks provided no real validation against actual active bots.
**Learning:** Comparing authentication tokens against environment variables with empty string fallbacks creates trivial bypasses. Furthermore, prefix-based authorization without database validation does not guarantee the caller is an active, recognized entity.
**Prevention:** Never use empty string fallbacks for sensitive environment variable checks. Always verify the environment variable is truthy (`if (systemToken && token === systemToken)`). For dynamically generated tokens, query the database (e.g. `bot_profiles`) to ensure the token corresponds to an active, valid entity.
