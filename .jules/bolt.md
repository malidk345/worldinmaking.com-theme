## 2024-05-23 - [Supabase Partial Fetching]
**Learning:** Supabase `select('*')` is wasteful for list views. Partial selection `select('id, title, ...')` significantly reduces payload size. SWR v2 allows passing options in array keys `['key', options]`.
**Action:** Always check `select('*')` usages in Supabase queries and optimize for required fields only.
