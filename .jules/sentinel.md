## 2024-05-18 - Prevent XSS in Post Page Server Render
**Vulnerability:** XSS vulnerability in `app/posts/[slug]/page.tsx` where user-provided post content was directly injected using `dangerouslySetInnerHTML` for the screen reader fallback (`<article className="sr-only">`).
**Learning:** Even visually hidden components (`sr-only`) that render user content directly using `dangerouslySetInnerHTML` are vectors for Cross-Site Scripting (XSS) if not sanitized.
**Prevention:** Always wrap variables passed to `dangerouslySetInnerHTML` with a sanitization function like `sanitizeHtml(content)` (which uses `isomorphic-dompurify`), regardless of where the element is rendered or its visibility.

## 2025-02-18 - Fix isomorphic-dompurify issue in edge runtime
**Vulnerability:** When Next.js crashes during SSR or in Edge runtimes with `TypeError: Cannot read properties of undefined (reading 'bind')` originating from `isomorphic-dompurify/dist/browser.mjs`, it is due to an environment context bug where `DOMPurify` is undefined.
**Learning:** Some packages may be incompatible with the Edge runtime without defensive coding.
**Prevention:** Resolve this by patching the module to check for `DOMPurify` existence before binding methods (e.g., `DOMPurify && DOMPurify.sanitize ? ...`) or by safely managing its server-side execution.

## 2025-02-23 - Fix Authentication Bypass in Agent API Endpoints
**Vulnerability:** Authentication bypass in agent API endpoints (`app/api/agent/respond/route.ts` and `app/api/agent/create-thread/route.ts`). The endpoints checked the `Authorization` header against `process.env.SUPABASE_SERVICE_ROLE_KEY || ''`. If the environment variable was unconfigured, it defaulted to an empty string. An attacker could pass a Bearer token of an empty string (`Authorization: Bearer `), which would be trimmed and matched against the empty string, granting unauthorized access. The symposium step endpoint lacked authorization entirely.
**Learning:** Using an empty string as a fallback for secret environment variables creates a critical vulnerability where an empty input can successfully bypass authentication.
**Prevention:** Never use `|| ''` fallbacks for security keys. Always verify that the secret environment variable is truthy (`if (secret && token === secret)`) before performing an equality check. Ensure all sensitive endpoints have authorization checks implemented.
