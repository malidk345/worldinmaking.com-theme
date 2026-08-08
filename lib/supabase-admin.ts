import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getRuntimeEnv, envFrom } from '../src/lib/bots/runtime-env'

/** True on Cloudflare Workers / next-on-pages / Next edge — skip Node-only fs/require. */
function isEdgeRuntime(): boolean {
    if (typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime !== 'undefined') return true;
    if (typeof process !== 'undefined' && process.env?.NEXT_RUNTIME === 'edge') return true;
    return false;
}

// Load env variables if running in local Node scripts (not edge / not Next)
if (typeof process !== 'undefined' && !process.env.NEXT_RUNTIME && !isEdgeRuntime()) {
    try {
        // Avoid static require so edge bundlers do not pull in fs/path
        const req = (0, eval)('require') as NodeRequire;
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

// Always use global fetch on edge (workerd). Optional node-fetch only for local Node scripts.
function getCustomFetch(): typeof fetch {
    if (!isEdgeRuntime() && typeof process !== 'undefined' && !process.env.NEXT_RUNTIME) {
        try {
            const req = (0, eval)('require') as NodeRequire;
            const res = req('node-fetch');
            return (res.default || res) as typeof fetch;
        } catch {
            // fall through to global fetch
        }
    }
    return fetch;
}

// ── Lazy edge-safe client ─────────────────────────────────────────────────
// CF Pages edge does NOT populate secrets in process.env — they only exist
// in getRequestContext().env. The client is therefore created on FIRST USE
// (inside the request handler call chain) via getRuntimeEnv(), which merges
// process.env + CF secrets. Kept behind a Proxy so existing call sites
// (`supabaseAdmin.from(...)`) keep working unchanged.
let cachedClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
    if (cachedClient) return cachedClient
    const env = getRuntimeEnv()
    const supabaseUrl = envFrom(env, 'NEXT_PUBLIC_SUPABASE_URL') || 'https://placeholder.supabase.co'
    const supabaseServiceKey =
        envFrom(env, 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'placeholder-key'
    cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        global: {
            fetch: getCustomFetch(),
        },
    })
    return cachedClient
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        const client = getSupabaseClient()
        const value = (client as unknown as Record<string, unknown>)[prop as string]
        return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value
    },
    set(_target, prop, value) {
        ;(getSupabaseClient() as unknown as Record<string, unknown>)[prop as string] = value
        return true
    },
})
