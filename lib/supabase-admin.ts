import { createClient } from '@supabase/supabase-js';

// Load env variables if running in local script to bypass ESM hoisting traps
if (typeof process !== 'undefined' && !process.env.NEXT_RUNTIME) {
    try {
        const req = eval('require');
        const fs = req('fs');
        const path = req('path');
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            envContent.split('\n').forEach((line: string) => {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    const key = match[1];
                    let value = match[2] || '';
                    if (value.includes('#') && !value.startsWith('"') && !value.startsWith("'")) {
                        value = value.split('#')[0].trim();
                    }
                    value = value.trim();
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1);
                    } else if (value.startsWith("'") && value.endsWith("'")) {
                        value = value.slice(1, -1);
                    }
                    if (process.env[key] === undefined) {
                        process.env[key] = value;
                    }
                }
            });
        }
    } catch {
        // ignore errors in edge environments
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

if (!supabaseUrl) {
    console.warn('[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL is missing!');
}
if (!supabaseServiceKey) {
    console.warn('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is missing! Admin operations will fail.');
}

// Helper to get robust fetch on local Node environment
function getCustomFetch() {
    if (typeof process !== 'undefined' && !process.env.NEXT_RUNTIME) {
        try {
            const req = eval('require');
            const res = req('node-fetch');
            return res.default || res;
        } catch {
            // fallback
        }
    }
    return fetch;
}

// Create a client with the service role key to bypass RLS policies on the server side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
    global: {
        fetch: getCustomFetch()
    }
});
