## 2024-05-23 - Supabase Mock Client Behavior
**Learning:** The mock Supabase client in `app/lib/supabase.js` returns `{ data: [], error: null }` synchronously for `select()` calls, unlike the real client which returns a Promise. This affects testing behavior when environment variables are missing.
**Action:** When testing without env vars, expect empty data and synchronous returns.

## 2024-05-23 - useSWR Key Structure
**Learning:** `useSWR` treats array keys strictly. `['posts', {}]` and `['posts', undefined]` are different keys. Always normalize options in custom hooks to ensure consistent cache keys.
**Action:** Use default parameters and normalization in custom hooks wrapping `useSWR`.
