/**
 * Token quota check endpoint.
 * Edge runtime.
 */
export const runtime = 'edge'

import { getSupabaseUserFromRequest } from '../../../lib/api-authz'
import { isUserPro } from '../../lib/wim-billing'
import { getTokenQuota, UserTier } from '../../lib/token-quota'
import { getClientIp } from 'lib/bots/request-validation'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

    try {
        const user = await getSupabaseUserFromRequest(req)
        if (!user) return json({ error: 'sign in required' }, 401)

        const isPro = isUserPro(user as any)
        const clientIp = getClientIp(req)
        const isDev = process.env.NODE_ENV === 'development' || clientIp === '127.0.0.1' || clientIp === '::1'

        const tier: UserTier = isDev ? 'dev' : isPro ? 'pro' : 'member'
        const quotaSubject = `user:${user.id}`

        const quota = await getTokenQuota(quotaSubject, tier)
        return json(quota as any, 200)
    } catch (err) {
        // Fail closed: never leak store/exception text to the composer.
        console.warn('[chat-quota] store check failed closed', err)
        return json(
            {
                code: 'QUOTA_UNAVAILABLE',
                error: 'Inquiry quota could not be verified. Please try again.',
            },
            503
        )
    }
}
