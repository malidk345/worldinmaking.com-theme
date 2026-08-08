/**
 * Diagnostic endpoint — reports which provider keys are visible at runtime.
 * REMOVE OR PROTECT THIS ENDPOINT AFTER DIAGNOSIS.
 * Only active if CRON_SECRET header matches, to prevent public exposure.
 */
export const runtime = 'edge'

import { getRuntimeEnv, getProviderKeyFlags, hasCloudflareContext } from 'lib/bots/runtime-env'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body, null, 2), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    // Gate behind CRON_SECRET to prevent public exposure
    const secret = req.headers.get('x-cron-secret') || req.headers.get('x-diag-secret')
    const env = getRuntimeEnv()
    const expectedSecret = env['CRON_SECRET'] || ''
    if (!secret || secret !== expectedSecret) {
        return json({ error: 'Unauthorized. Send x-cron-secret header.' }, 401)
    }

    const flags = getProviderKeyFlags(env)

    // List all env key NAMES visible (not values) so we can see what CF exposed
    const visibleKeys = Object.keys(env).filter(k => env[k] && String(env[k]).length > 0)

    // Check specific key name variants the code looks for
    const groqVariants = ['GROQ_API_KEY', 'GROQ_KEYS', 'GROQ_KEY']
    const geminiVariants = ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY']
    const openrouterVariants = ['OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY']

    const groqFound = groqVariants.find(k => env[k]?.trim())
    const geminiFound = geminiVariants.find(k => env[k]?.trim())
    const openrouterFound = openrouterVariants.find(k => env[k]?.trim())

    return json({
        ok: true,
        cfContext: hasCloudflareContext(),
        envSource: flags.envSource,
        providerFlags: flags,
        // Show which exact key name was found for each provider
        keyNames: {
            groq: groqFound ?? null,
            gemini: geminiFound ?? null,
            openrouter: openrouterFound ?? null,
        },
        // Masked values (first 8 chars only)
        keyPreviews: {
            groq: groqFound ? String(env[groqFound]).slice(0, 8) + '...' : null,
            gemini: geminiFound ? String(env[geminiFound]).slice(0, 8) + '...' : null,
            openrouter: openrouterFound ? String(env[openrouterFound]).slice(0, 8) + '...' : null,
        },
        // All env key NAMES visible (not values)
        allVisibleKeyNames: visibleKeys.sort(),
    })
}
