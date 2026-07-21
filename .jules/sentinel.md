## 2024-05-18 - Prevent XSS in Post Page Server Render
**Vulnerability:** XSS vulnerability in `app/posts/[slug]/page.tsx` where user-provided post content was directly injected using `dangerouslySetInnerHTML` for the screen reader fallback (`<article className="sr-only">`).
**Learning:** Even visually hidden components (`sr-only`) that render user content directly using `dangerouslySetInnerHTML` are vectors for Cross-Site Scripting (XSS) if not sanitized.
**Prevention:** Always wrap variables passed to `dangerouslySetInnerHTML` with a sanitization function like `sanitizeHtml(content)` (which uses `isomorphic-dompurify`), regardless of where the element is rendered or its visibility.

## 2025-02-18 - Fix isomorphic-dompurify issue in edge runtime
**Vulnerability:** When Next.js crashes during SSR or in Edge runtimes with `TypeError: Cannot read properties of undefined (reading 'bind')` originating from `isomorphic-dompurify/dist/browser.mjs`, it is due to an environment context bug where `DOMPurify` is undefined.
**Learning:** Some packages may be incompatible with the Edge runtime without defensive coding.
**Prevention:** Resolve this by patching the module to check for `DOMPurify` existence before binding methods (e.g., `DOMPurify && DOMPurify.sanitize ? ...`) or by safely managing its server-side execution.

## 2024-05-18 - XSS vulnerability via regex-based sanitization bypass
**Vulnerability:** The custom regex-based HTML sanitization logic in `utils/security.ts` (specifically `sanitizeString`) was vulnerable to XSS. It failed to sanitize several edge cases properly such as `<svg/onload=alert(1)>` and `<math><mi//xlink:href="data:x,...">`. Since `dangerouslySetInnerHTML` uses this function directly, these bypassed payloads were executed by the browser.
**Learning:** Custom regex is almost never sufficient for HTML sanitization due to the incredible complexity and edge cases in browser parsers. Using custom regexes often gives a false sense of security, which is extremely dangerous when dealing with `dangerouslySetInnerHTML`.
**Prevention:** Always use established, battle-tested libraries like `DOMPurify` (or `isomorphic-dompurify` for server/edge compat) instead of writing custom regular expressions for HTML sanitization.
