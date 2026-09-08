const fs = require('fs');

let file = fs.readFileSync('src/lib/bots/supabase-edge.ts', 'utf8');

// The issue is `getSupabaseConfig` looks for `SUPABASE_SERVICE_ROLE_KEY`
// but the test provides `NEXT_PUBLIC_SUPABASE_ANON_KEY`!
// We should update getSupabaseConfig to look for NEXT_PUBLIC_SUPABASE_ANON_KEY if SUPABASE_SERVICE_ROLE_KEY is missing.
file = file.replace(
    "const key = envFrom(store, 'SUPABASE_SERVICE_ROLE_KEY')",
    "const key = envFrom(store, 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY')"
);
fs.writeFileSync('src/lib/bots/supabase-edge.ts', file);
