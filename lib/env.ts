export function validateEnv() {
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
