# Gatsby Migration Inventory

## 1. Gatsby-related Webpack Aliases (next.config.js)
The following aliases are used in `next.config.js` to redirect Gatsby imports to shim files:
- `'gatsby$'` -> `shims/gatsby.tsx`
- `'gatsby'` -> `shims/gatsby.tsx`
- `'gatsby-plugin-image'` -> `shims/gatsby-plugin-image.tsx`
- `'gatsby-plugin-mdx'` -> `shims/gatsby.tsx`
- `'gatsby-plugin-breakpoints'` -> `shims/gatsby.tsx`
- `'@gatsbyjs/reach-router'` -> `shims/reach-router.ts`
- `'@reach/router'` -> `shims/reach-router.ts`

## 2. Shim Files Summary
- **`shims/gatsby.tsx`**:
  - Mocks `Link` using `next/link` and `next/router`.
  - Provides a client-side `navigate` implementation (`window.location`).
  - Mocks Gatsby's GraphQL data layer with `createMockQueryData()`, providing empty arrays and objects for `useStaticQuery` and `StaticQuery`.
  - Mocks `graphql` as a function returning an empty string.
  - Mocks MDX and structural components like `MDXRenderer`, `Slice`, `Script`, `Subfeature`, `SlidesTemplate`.
  - Mocks hooks like `useBreakpoint` and `useLocation` (falling back to `next/router` and `window.location`).
- **`shims/gatsby-plugin-image.tsx`**:
  - Mocks `GatsbyImage` and `StaticImage` components by rendering standard `<img>` tags.
  - Mocks the `getImage` helper function, returning a simple fallback image URL.
- **`shims/reach-router.ts`**:
  - Mocks `useLocation` hook by deriving the initial value from Next.js' `useRouter` and updating to `window.location` on mount.
  - Mocks `useNavigate` to perform client-side redirection using `window.location`.

## 3. Gatsby Imports Outside `src/` and `worldinmaking.com-theme/`
- **`.storybook/preview.js`**: `import { createHistory, LocationProvider } from '@reach/router'`
- **`.storybook/main.js`**: Reference to `babel-plugin-remove-graphql-queries` in comments and code.

*(Note: Other instances of Gatsby-related keywords in files like `tsconfig.tsbuildinfo`, `lib/quality-gate.ts`, and `README.md` are documentation or metadata, not active imports).*

## 4. Route Files (`src/pages/`)
All route files under `src/pages/` are currently using **client-side rendering** (e.g., `useEffect`, `fetch`, or client-side routing) and do **not** use Next.js Pages Router data fetching APIs (`getStaticProps` or `getServerSideProps`). The only exception is `src/pages/posts/new.tsx`, which contains an occurrence of `getServerSideProps`.

The route files list:
- `src/pages/handbook.tsx` (Client-side)
- `src/pages/newsletter-fbc.tsx` (Client-side)
- `src/pages/posthug.tsx` (Client-side)
- `src/pages/baa.tsx` (Client-side)
- `src/pages/signup.tsx` (Client-side)
- `src/pages/changelog-video/index.tsx` (Client-side)
- `src/pages/dpa.tsx` (Client-side)
- `src/pages/community.tsx` (Client-side)
- `src/pages/_document.tsx` (Client-side)
- `src/pages/forum/index.tsx` (Client-side)
- `src/pages/places/index.tsx` (Client-side)
- `src/pages/hogwatch/index.tsx` (Client-side)
- `src/pages/ko/index.tsx` (Client-side)
- `src/pages/community/profile/edit.tsx` (Client-side)
- `src/pages/community/achievements.tsx` (Client-side)
- `src/pages/community/reputation.tsx` (Client-side)
- `src/pages/community/directory.tsx` (Client-side)
- `src/pages/community/dashboard.tsx` (Client-side)
- `src/pages/community/notifications.tsx` (Client-side)
- `src/pages/community/latest.tsx` (Client-side)
- `src/pages/community/profiles/[id].tsx` (Client-side)
- `src/pages/community/profiles/me.tsx` (Client-side)
- `src/pages/reset-password.tsx` (Client-side)
- `src/pages/start.tsx` (Client-side)
- `src/pages/media.tsx` (Client-side)
- `src/pages/event-comparison.tsx` (Client-side)
- `src/pages/[...slug].tsx` (Client-side)
- `src/pages/art-library.tsx` (Client-side)
- `src/pages/questions/[permalink].tsx` (Client-side)
- `src/pages/questions/topic/max.tsx` (Client-side)
- `src/pages/questions/topic/{SqueakTopic.slug}.tsx` (Client-side)
- `src/pages/questions/subscriptions.tsx` (Client-side)
- `src/pages/questions/index.tsx` (Client-side)
- `src/pages/team-updates.tsx` (Client-side)
- `src/pages/image-annotator/index.tsx` (Client-side)
- `src/pages/team-directory.tsx` (Client-side)
- `src/pages/101.tsx` (Client-side)
- `src/pages/blog/index.tsx` (Client-side)
- `src/pages/terms.tsx` (Client-side)
- `src/pages/subprocessors.tsx` (Client-side)
- `src/pages/notebooks/index.tsx` (Client-side)
- `src/pages/events.tsx` (Client-side)
- `src/pages/self-driving/index.tsx` (Client-side)
- `src/pages/wizard/index.tsx` (Client-side)
- `src/pages/kbd/index.tsx` (Client-side)
- `src/pages/_app.tsx` (Client-side)
- `src/pages/_error.tsx` (Client-side)
- `src/pages/activity/index.tsx` (Client-side)
- `src/pages/desktop.tsx` (Client-side)
- `src/pages/customers/index.tsx` (Client-side)
- `src/pages/404.js` (Client-side)
- `src/pages/why.tsx` (Client-side)
- `src/pages/privacy.tsx` (Client-side)
- `src/pages/services.tsx` (Client-side)
- `src/pages/sparks-joy/hedgehog-mode/index.tsx` (Client-side)
- `src/pages/sparks-joy/brickhog/index.tsx` (Client-side)
- `src/pages/sparks-joy/hogwars/index.tsx` (Client-side)
- `src/pages/sparks-joy/dictator-or-tech-bro/index.tsx` (Client-side)
- `src/pages/sparks-joy/hogpatch/index.tsx` (Client-side)
- `src/pages/sparks-joy/index.tsx` (Client-side)
- `src/pages/ai/index.tsx` (Client-side)
- `src/pages/posts/new.tsx` (**Uses getServerSideProps**)
- `src/pages/posts/[slug]/index.tsx` (Client-side)
- `src/pages/posts/[slug]/edit.tsx` (Client-side)
- `src/pages/paint/index.tsx` (Client-side)
- `src/pages/partnerships/index.tsx` (Client-side)
- `src/pages/slack-invite.tsx` (Client-side)
- `src/pages/login.tsx` (Client-side)
- `src/pages/feature-matrix/index.tsx` (Client-side)
- `src/pages/photobooth.tsx` (Client-side)
- `src/pages/about.tsx` (Client-side)
- `src/pages/profiles/index.tsx` (Client-side)
- `src/pages/bookmarks.tsx` (Client-side)
- `src/pages/code/open.tsx` (Client-side)
- `src/pages/code/download.tsx` (Client-side)
- `src/pages/events-feedback-form.tsx` (Client-side)
- `src/pages/r/product-analytics.tsx` (Client-side)
- `src/pages/r/session-replay.tsx` (Client-side)
- `src/pages/r/ai-observability.tsx` (Client-side)
- `src/pages/r/posthog-mcp.tsx` (Client-side)
- `src/pages/r/error-tracking.tsx` (Client-side)
- `src/pages/chapters.tsx` (Client-side)
- `src/pages/cool-tech-jobs.tsx` (Client-side)

## 5. Dynamic Routing (`src/pages/[...slug].tsx`)
Based on the `rootSegment` (the first path segment), the dynamic route renders different components:

| `rootSegment` | Target Component |
| :--- | :--- |
| `ideas`, `blueprints` | `IdeasHub` |
| `profile`, `u` | `ProfileWrapper` |
| `notebooks` | `NotebooksListSkeleton` |
| `questions`, `forum`, `community` | `Inbox` |
| `terms`, `privacy`, `dpa`, `baa`, `subprocessors` | `Legal` |
| `display-options` | `DisplayOptions` |
| `handbook`, `docs`, `manual` | `HandbookTemplate` (with placeholder data) |
| *(fallback for all others)* | `BlogPostContainer` -> `BlogPostTemplate` |

## 6. Gatsby Dependencies (`package.json`)
The following Gatsby-related dependencies exist in `package.json`:
- `"@gatsbyjs/reach-router": "^1.3.9"`
