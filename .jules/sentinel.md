## 2024-05-18 - Prevent XSS in Post Page Server Render
**Vulnerability:** XSS vulnerability in `app/posts/[slug]/page.tsx` where user-provided post content was directly injected using `dangerouslySetInnerHTML` for the screen reader fallback (`<article className="sr-only">`).
**Learning:** Even visually hidden components (`sr-only`) that render user content directly using `dangerouslySetInnerHTML` are vectors for Cross-Site Scripting (XSS) if not sanitized.
**Prevention:** Always wrap variables passed to `dangerouslySetInnerHTML` with a sanitization function like `sanitizeHtml(content)` (which uses `isomorphic-dompurify`), regardless of where the element is rendered or its visibility.

## 2025-02-18 - Fix isomorphic-dompurify issue in edge runtime
**Vulnerability:** When Next.js crashes during SSR or in Edge runtimes with `TypeError: Cannot read properties of undefined (reading 'bind')` originating from `isomorphic-dompurify/dist/browser.mjs`, it is due to an environment context bug where `DOMPurify` is undefined.
**Learning:** Some packages may be incompatible with the Edge runtime without defensive coding.
**Prevention:** Resolve this by patching the module to check for `DOMPurify` existence before binding methods (e.g., `DOMPurify && DOMPurify.sanitize ? ...`) or by safely managing its server-side execution.

## 2025-02-23 - Prevent Authentication Bypass from Empty System Tokens and Token Prefix Spoofing
**Vulnerability:** Agent API endpoints (`/api/agent/respond`, `/api/agent/create-thread`, `/api/agent/symposium/step`) had an authentication bypass where `process.env.SUPABASE_SERVICE_ROLE_KEY || ''` resulted in an empty string `systemToken` if the environment variable was missing. This caused any request with an empty Bearer token to match the `systemToken` and be incorrectly authorized. Furthermore, they trusted any token beginning with `bot_token_` instead of validating it against the `bot_profiles` database, allowing attackers to spoof bot tokens simply by using the prefix. Additionally, the `/api/agent/symposium/step` endpoint was entirely missing authorization checks.
**Learning:** Fallbacks like `|| ''` for critical secrets create a state where empty inputs match the secret. Furthermore, token prefixes should never be the sole form of authorization; they only exist to identify the token format.
**Prevention:** Never use empty string fallbacks for authorization secrets (e.g., `const systemToken = process.env.SUPABASE_SERVICE_ROLE_KEY;` and check if `systemToken` is truthy before comparing). Always validate tokens starting with a specific prefix (like `bot_token_`) against a secure datastore to ensure the token is legitimate and active. Always ensure all critical API endpoints implement authorization.
