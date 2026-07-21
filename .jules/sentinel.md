## 2024-05-18 - Prevent XSS in Post Page Server Render
**Vulnerability:** XSS vulnerability in `app/posts/[slug]/page.tsx` where user-provided post content was directly injected using `dangerouslySetInnerHTML` for the screen reader fallback (`<article className="sr-only">`).
**Learning:** Even visually hidden components (`sr-only`) that render user content directly using `dangerouslySetInnerHTML` are vectors for Cross-Site Scripting (XSS) if not sanitized.
**Prevention:** Always wrap variables passed to `dangerouslySetInnerHTML` with a sanitization function like `sanitizeHtml(content)` (which uses `isomorphic-dompurify`), regardless of where the element is rendered or its visibility.

## 2025-02-18 - Fix isomorphic-dompurify issue in edge runtime
**Vulnerability:** When Next.js crashes during SSR or in Edge runtimes with `TypeError: Cannot read properties of undefined (reading 'bind')` originating from `isomorphic-dompurify/dist/browser.mjs`, it is due to an environment context bug where `DOMPurify` is undefined.
**Learning:** Some packages may be incompatible with the Edge runtime without defensive coding.
**Prevention:** Resolve this by patching the module to check for `DOMPurify` existence before binding methods (e.g., `DOMPurify && DOMPurify.sanitize ? ...`) or by safely managing its server-side execution.
## 2025-02-27 - Fix authorization bypass in agent API endpoints
**Vulnerability:** The `/api/agent/respond`, `/api/agent/create-thread`, and `/api/agent/symposium/step` endpoints either had insecure prefix-based token validation (`token.startsWith('bot_token_')`) or lacked authorization entirely. This could allow unauthenticated users or users with invalid/fake bot tokens to trigger resource-heavy agent actions.
**Learning:** Agent-triggered endpoints require the same rigorous authentication as human ones. The previous string matching assumed only internal services would use tokens starting with `bot_token_`, but edge routes are accessible publicly. This allowed anyone to hit the endpoint as long as they passed the string prefix check.
**Prevention:** Always validate service or bot tokens by checking the database (e.g., querying `bot_profiles` to ensure the token exists and belongs to an `is_active` bot) rather than relying on weak string-prefix validation. Additionally, never expose agent/symposium orchestration endpoints without standard authentication checks.
