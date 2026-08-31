import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseUserFromRequest } from '../../../lib/api-authz'
import { isUserPro } from '../../lib/wim-billing'
import { getTokenQuota, UserTier } from '../../lib/token-quota'
import { getClientIp } from '../../lib/bots/rate-limit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const standardReq = new Request(
            `https://${req.headers.host || 'localhost'}${req.url || '/api/chat-quota'}`,
            {
                method: 'GET',
                headers: req.headers as any,
            }
        )

        const user = await getSupabaseUserFromRequest(standardReq)
        const isPro = user ? isUserPro(user as any) : false
        const clientIp = getClientIp(standardReq)
        const isDev = process.env.NODE_ENV === 'development' || clientIp === '127.0.0.1' || clientIp === '::1'

        const tier: UserTier = isDev ? 'dev' : isPro ? 'pro' : user ? 'member' : 'guest'
        const quotaSubject = user ? `user:${user.id}` : `ip:${clientIp}`

        const quota = await getTokenQuota(quotaSubject, tier)
        return res.status(200).json(quota)
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Failed to fetch token quota' })
    }
}
