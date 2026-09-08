const assert = require('assert');

// The issue is `getSupabaseConfig` looks for `SUPABASE_SERVICE_ROLE_KEY`
// but the test provides `NEXT_PUBLIC_SUPABASE_ANON_KEY`!
//
// Let's look at `getSupabaseConfig`:
// const key = envFrom(store, 'SUPABASE_SERVICE_ROLE_KEY')
//
// It returns `{ ok: false, error: 'Supabase not configured', status: 503 }` because key is empty.
