/**
 * Diagnostic endpoint — reports which provider keys are visible at runtime.
 * REMOVE OR PROTECT THIS ENDPOINT AFTER DIAGNOSIS.
 * Only active if CRON_SECRET header matches, to prevent public exposure.
 */


import { getRuntimeEnv, getProviderKeyFlags, hasCloudflareContext } from 'lib/bots/runtime-env'
import { envFrom } from 'lib/bots/runtime-env'
import { checkRateLimit } from 'lib/bots/rate-limit'
import { getClientIp } from 'lib/bots/request-validation'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body, null, 2), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

    const env = getRuntimeEnv()
    const expectedSecret = envFrom(env, 'CRON_SECRET', 'BOT_ACT_SECRET')
    const secret =
        req.headers.get('x-cron-secret') ||
        req.headers.get('x-diag-secret') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!expectedSecret || !secret || secret !== expectedSecret) {
        return json({ error: 'Not found' }, 404)
    }
    const rate = checkRateLimit(`diag:${getClientIp(req)}`, 10, 60 * 60 * 1000)
    if (!rate.allowed) {
        return json({ error: 'Rate limited', retryAfterSec: rate.retryAfterSec }, 429)
    }

    const flags = getProviderKeyFlags(env)

    // List all env key NAMES visible (not values) so we can see what CF exposed
    const visibleKeys = Object.keys(env).filter(k => env[k] && String(env[k]).length > 0)

    return json({
        ok: true,
        cfContext: hasCloudflareContext(),
        envSource: flags.envSource,
        providerFlags: flags,
        // Only aggregate readiness is returned. Never expose key names or previews.
        visibleKeyCount: visibleKeys.length,
    })
}
