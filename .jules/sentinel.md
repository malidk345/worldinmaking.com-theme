## 2024-05-18 - Prevent XSS in Post Page Server Render
**Vulnerability:** XSS vulnerability in `app/posts/[slug]/page.tsx` where user-provided post content was directly injected using `dangerouslySetInnerHTML` for the screen reader fallback (`<article className="sr-only">`).
**Learning:** Even visually hidden components (`sr-only`) that render user content directly using `dangerouslySetInnerHTML` are vectors for Cross-Site Scripting (XSS) if not sanitized.
**Prevention:** Always wrap variables passed to `dangerouslySetInnerHTML` with a sanitization function like `sanitizeHtml(content)` (which uses `isomorphic-dompurify`), regardless of where the element is rendered or its visibility.

## 2025-02-18 - Fix isomorphic-dompurify issue in edge runtime
**Vulnerability:** When Next.js crashes during SSR or in Edge runtimes with `TypeError: Cannot read properties of undefined (reading 'bind')` originating from `isomorphic-dompurify/dist/browser.mjs`, it is due to an environment context bug where `DOMPurify` is undefined.
**Learning:** Some packages may be incompatible with the Edge runtime without defensive coding.
**Prevention:** Resolve this by patching the module to check for `DOMPurify` existence before binding methods (e.g., `DOMPurify && DOMPurify.sanitize ? ...`) or by safely managing its server-side execution.
## 2025-07-21 - Fix Authentication Bypass in Agent API Routes
**Vulnerability:** Agent API routes (`app/api/agent/respond/route.ts`, `app/api/agent/create-thread/route.ts`, `app/api/agent/symposium/step/route.ts`) were vulnerable to an authentication bypass. The authorization check compared the incoming token against the `SUPABASE_SERVICE_ROLE_KEY` environment variable. If the environment variable was empty or not set, it defaulted to an empty string. A malicious user could then send an empty Bearer token or any token, causing the comparison to pass incorrectly, thus gaining unauthorized access.
**Learning:** Always explicitly verify that critical environment variables used for authentication (like `SUPABASE_SERVICE_ROLE_KEY`) are non-empty strings before using them in token comparisons. An empty string is a valid value for string matching and can lead to immediate bypasses.
**Prevention:** Never fallback to empty strings for authorization tokens. Always ensure both sides of the comparison are valid, truthy values. Also, for bot tokens, verify against the database correctly instead of just checking string prefixes.
