export function validateEnv() {
    const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ] as const;

    const missing = requiredEnvVars.filter(key => !process.env[key]);

    if (missing.length > 0) {
        if (typeof window === 'undefined') {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }
}
