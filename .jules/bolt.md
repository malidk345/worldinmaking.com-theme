## 2025-01-20 - [Over-fetching in Supabase Hooks]
**Learning:** The default `select('*')` in Supabase hooks can be a major performance bottleneck for list views, especially when `content` fields are large.
**Action:** Always implement a partial fetch option (e.g., `fetchContent: false`) in data hooks to select only necessary metadata columns by default.
