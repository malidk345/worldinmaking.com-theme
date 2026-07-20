import fs from 'fs';
import path from 'path';

function loadEnv() {
    if (typeof window !== 'undefined') return;
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
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                if (process.env[key] === undefined) process.env[key] = value;
            }
        });
    }
}

export function validateEnv() {
    loadEnv();
    // Only strictly validate in actual runtime (or when variables are expected).
    // During Next.js build, process.env.NODE_ENV is usually 'production'
    // But we don't want to crash static page generation if keys are missing.
    // Instead, log a warning unless CI/BUILD explicit flag says skip.
    const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ] as const;

    const missing = requiredEnvVars.filter(key => !process.env[key]);

    if (missing.length > 0) {
        if (typeof window === 'undefined') {
            console.warn(`[WARNING] Missing required environment variables: ${missing.join(', ')}`);
        }
    }
}
