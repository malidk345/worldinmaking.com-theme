## 2024-05-18 - Prevent XSS in Post Page Server Render
**Vulnerability:** XSS vulnerability in `app/posts/[slug]/page.tsx` where user-provided post content was directly injected using `dangerouslySetInnerHTML` for the screen reader fallback (`<article className="sr-only">`).
**Learning:** Even visually hidden components (`sr-only`) that render user content directly using `dangerouslySetInnerHTML` are vectors for Cross-Site Scripting (XSS) if not sanitized.
**Prevention:** Always wrap variables passed to `dangerouslySetInnerHTML` with a sanitization function like `sanitizeHtml(content)` (which uses `isomorphic-dompurify`), regardless of where the element is rendered or its visibility.

## 2025-02-18 - Fix isomorphic-dompurify issue in edge runtime
**Vulnerability:** When Next.js crashes during SSR or in Edge runtimes with `TypeError: Cannot read properties of undefined (reading 'bind')` originating from `isomorphic-dompurify/dist/browser.mjs`, it is due to an environment context bug where `DOMPurify` is undefined.
**Learning:** Some packages may be incompatible with the Edge runtime without defensive coding.
**Prevention:** Resolve this by patching the module to check for `DOMPurify` existence before binding methods (e.g., `DOMPurify && DOMPurify.sanitize ? ...`) or by safely managing its server-side execution.

## 2026-07-22 - Fix Empty String Auth Bypass in Edge API Routes
**Vulnerability:** Found an authentication bypass vulnerability where `process.env.SUPABASE_SERVICE_ROLE_KEY || ''` fell back to an empty string. The auth code would then match this against a missing or empty bearer token, allowing unauthenticated requests to pass authorization checks. Additionally, `bot_token_` prefix was solely being checked instead of verifying the actual API token in the database.
**Learning:** Never fallback to empty strings or other truthy falsy defaults for critical secret checks, as user input could match them. Always ensure an environment variable is present. Secondly, never authenticate strictly off of token structure prefixes—always query the authentication datastore or validate cryptographic signatures. Next.js edge functions didn't have a centralized secure bot auth route, leading to copy-pasting of vulnerable code.
**Prevention:** Use truthy guards (e.g. `if (systemToken && token === systemToken)`) for environment variable tokens. Centralize auth logic into reusable robust utilities (`lib/agent-auth.ts`) rather than inlining them. Verify API tokens directly against the datastore or cache, asserting they exist and are active.
