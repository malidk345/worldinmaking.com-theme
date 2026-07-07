import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env variables from .env.local if not already defined (essential for hoisted ESM scripts)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
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
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL is missing!');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is missing! Admin operations will fail.');
}

// Create a client with the service role key to bypass RLS policies on the server side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
