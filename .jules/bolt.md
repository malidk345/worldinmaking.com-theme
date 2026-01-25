## 2024-05-23 - Data Over-fetching in List Views
**Learning:** The application was fetching full post content (Markdown) for every post in the list views (`HomeWindow`, `Dashboard`, `Explore`), even though only metadata and excerpts were needed. This causes significant unnecessary data transfer and memory usage.
**Action:** When creating list views or fetching collections, always select specific columns instead of `*`. Only fetch full content when rendering the detail view or when strictly necessary (e.g., client-side full-text search).
